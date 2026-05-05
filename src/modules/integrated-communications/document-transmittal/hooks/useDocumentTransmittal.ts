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

    // Action State
    const [isAcknowledging, setIsAcknowledging] = useState(false);

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
            if (status !== "All") params.append("status", status);
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
     * Executes the acknowledgment for selected invoices.
     */
    const handleAcknowledge = useCallback(async (id: number, detailIds: number[]) => {
        if (detailIds.length === 0) return false;

        setIsAcknowledging(true);
        try {
            const response = await fetch(`/api/ic/document-transmittal/${id}?action=acknowledge`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ detailIds }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success("Success", { description: "Invoices acknowledged successfully." });
                
                // Refresh local detail state to show timestamps immediately
                await fetchDetail(id);
                // Refresh master list in background to update counts/status
                refresh();
                
                return true;
            } else {
                toast.error("Update Failed", { description: result.message || "Failed to acknowledge invoices" });
                return false;
            }
        } catch (err) {
            console.error("[useDocumentTransmittal] Acknowledge error:", err);
            toast.error("Error", { description: "A network error occurred. Please try again." });
            return false;
        } finally {
            setIsAcknowledging(false);
        }
    }, [fetchDetail, refresh]);

    // Re-fetch whenever applied filters change
    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        // List
        transmittals,
        isLoading,
        error,
        refresh,

        // Filter Helpers
        availableSenders,
        availableReceivers,

        // Detail
        selectedTransmittal,
        selectedDetails,
        transmittalStatus,
        isDetailLoading,
        fetchDetail,

        // Actions
        handleAcknowledge,
        isAcknowledging,

        // Modals
        isDetailModalOpen,
        setDetailModalOpen,
    };
};
