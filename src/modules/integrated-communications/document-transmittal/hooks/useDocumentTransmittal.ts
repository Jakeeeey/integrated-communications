"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { 
    DocumentTransmittalListItem, 
    DocumentTransmittalHeader, 
    DocumentTransmittalDetail,
    TransmittalStatus
} from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.types";
import { useDocumentTransmittalFilter } from "../context/DocumentTransmittalFilterContext";

/**
 * src/modules/integrated-communications/document-transmittal/hooks/useDocumentTransmittal.ts
 * Main hook for the Document Transmittal module UI.
 * Consumes applied filters from context and triggers server-side fetches.
 */
export const useDocumentTransmittal = () => {
    // List State
    const [transmittals, setTransmittals] = useState<DocumentTransmittalListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<{ label: string; value: string }[]>([]);

    // Consume Filter Context
    const { 
        senderId, 
        receiverId, 
        status, 
        dateRange 
    } = useDocumentTransmittalFilter();

    // Detail State
    const [selectedTransmittal, setSelectedTransmittal] = useState<DocumentTransmittalHeader | null>(null);
    const [selectedDetails, setSelectedDetails] = useState<DocumentTransmittalDetail[]>([]);
    const [transmittalStatus, setTransmittalStatus] = useState<TransmittalStatus | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    // Action State
    const [isAcknowledging, setIsAcknowledging] = useState(false);
    const [isBulkAcknowledging, setIsBulkAcknowledging] = useState(false);

    /**
     * Fetches the master list of transmittals with server-side filtering.
     * Triggers whenever the APPLIED filters in context change.
     */
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (senderId) params.append("senderId", senderId);
            if (receiverId) params.append("receiverId", receiverId);
            
            // Handle multiple statuses
            if (status && status.length > 0) {
                status.forEach(s => params.append("status", s));
            }

            if (dateRange?.from) params.append("dateFrom", dateRange.from.toISOString());
            if (dateRange?.to) params.append("dateTo", dateRange.to.toISOString());

            const response = await fetch(`/api/ic/document-transmittal?${params.toString()}`);
            const result = await response.json();

            if (response.ok && result.success) {
                setTransmittals(result.data);
            } else {
                setError(result.message || "Failed to load transmittals");
            }
        } catch (err) {
            console.error("[useDocumentTransmittal] List fetch error:", err);
            setError("A network error occurred while loading the list.");
        } finally {
            setIsLoading(false);
        }
    }, [senderId, receiverId, status, dateRange]);

    /**
     * Fetches all active users for the delegation dropdown.
     */
    const fetchAllUsers = useCallback(async () => {
        try {
            const response = await fetch(`/api/ic/document-transmittal/users`);
            const result = await response.json();
            if (response.ok && result.success) {
                const formatted = result.data.map((u: any) => ({
                    label: `${u.user_fname} ${u.user_lname}`,
                    value: u.user_id.toString()
                }));
                setAllUsers(formatted);
            }
        } catch (err) {
            console.error("[useDocumentTransmittal] User fetch error:", err);
        }
    }, []);

    /**
     * Unique Senders and Receivers for filter options (derived from full list)
     */
    const availableSenders = useMemo(() => {
        const map = new Map<number, string>();
        transmittals.forEach(t => {
            if (t.senderId) map.set(t.senderId, t.senderName);
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ label: name, value: id.toString() }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [transmittals]);

    const availableReceivers = useMemo(() => {
        const map = new Map<number, string>();
        transmittals.forEach(t => {
            if (t.receiverId) map.set(t.receiverId, t.receiverName);
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ label: name, value: id.toString() }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [transmittals]);

    /**
     * Fetches details for a specific transmittal.
     */
    const fetchDetail = useCallback(async (id: number) => {
        setIsDetailLoading(true);
        try {
            const response = await fetch(`/api/ic/document-transmittal/${id}`);
            const result = await response.json();

            if (response.ok && result.success) {
                setSelectedTransmittal(result.data.header);
                setSelectedDetails(result.data.details);
                setTransmittalStatus(result.data.status);
                setDetailModalOpen(true);
            } else {
                toast.error("Error", { description: result.message || "Failed to load details" });
            }
        } catch (err) {
            console.error("[useDocumentTransmittal] Detail fetch error:", err);
            toast.error("Network Error", { description: "Failed to connect to the server." });
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    /**
     * Executes the acknowledgment for selected invoices, handling reassignment if necessary.
     */
    const handleAcknowledgeWithUser = useCallback(async (id: number, detailIds: number[], assignedUserId: number, originalReceiverId: number) => {
        if (detailIds.length === 0 || !assignedUserId) return false;

        setIsAcknowledging(true);
        try {
            let targetHeaderId = id;

            // 1. If assigned user is different from original receiver, split it first
            if (assignedUserId !== originalReceiverId) {
                const reassignRes = await fetch(`/api/ic/document-transmittal/${id}?action=reassign`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ detailIds, newUserId: assignedUserId }),
                });
                
                const reassignResult = await reassignRes.json();
                
                if (!reassignRes.ok || !reassignResult.success) {
                     toast.error("Reassign Failed", { description: reassignResult.message || "Failed to reassign invoices to the selected user." });
                     return false;
                }
                
                // The newly created transmittal header ID
                targetHeaderId = reassignResult.newHeaderId;
            }

            // 2. Acknowledge the invoices under the target header
            const ackRes = await fetch(`/api/ic/document-transmittal/${targetHeaderId}?action=acknowledge`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ detailIds }),
            });
            
            const ackResult = await ackRes.json();

            if (ackRes.ok && ackResult.success) {
                toast.success("Success", { description: "Invoices acknowledged successfully." });
                
                // Refresh local detail state to show changes
                await fetchDetail(id);
                // Refresh master list in background
                refresh();
                
                return true;
            } else {
                toast.error("Acknowledge Failed", { description: ackResult.message || "Failed to acknowledge invoices" });
                return false;
            }
        } catch (err) {
            console.error("[useDocumentTransmittal] Acknowledge With User error:", err);
            toast.error("Error", { description: "A network error occurred. Please try again." });
            return false;
        } finally {
            setIsAcknowledging(false);
        }
    }, [fetchDetail, refresh]);

    /**
     * Executes bulk acknowledgment across multiple headers.
     */
    const handleBulkAcknowledge = useCallback(async (details: { id: number; headerId: number }[], newUserId: number) => {
        if (details.length === 0 || !newUserId) return false;

        setIsBulkAcknowledging(true);
        try {
            const response = await fetch(`/api/ic/document-transmittal/bulk-acknowledge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ details, newUserId }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success("Success", { description: "Bulk acknowledgment complete." });
                refresh();
                return true;
            } else {
                toast.error("Bulk Acknowledge Failed", { description: result.message || "Failed to acknowledge invoices" });
                return false;
            }
        } catch (err) {
            console.error("[useDocumentTransmittal] Bulk Acknowledge error:", err);
            toast.error("Error", { description: "A network error occurred. Please try again." });
            return false;
        } finally {
            setIsBulkAcknowledging(false);
        }
    }, [refresh]);

    // Re-fetch whenever applied filters change
    useEffect(() => {
        refresh();
        fetchAllUsers();
    }, [refresh, fetchAllUsers]);

    return {
        // List
        transmittals,
        isLoading,
        error,
        refresh,

        // Filter Helpers
        availableSenders,
        availableReceivers,
        allUsers,

        // Detail
        selectedTransmittal,
        selectedDetails,
        transmittalStatus,
        isDetailLoading,
        fetchDetail,

        // Actions
        handleAcknowledgeWithUser,
        isAcknowledging,
        handleBulkAcknowledge,
        isBulkAcknowledging,

        // Modals
        isDetailModalOpen,
        setDetailModalOpen,
        isBulkModalOpen,
        setIsBulkModalOpen,
    };
};
