"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { 
    DocumentTransmittalListItem, 
    DocumentTransmittalHeader, 
    DocumentTransmittalDetail,
    TransmittalStatus
} from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.types";

/**
 * src/modules/integrated-communications/document-transmittal/hooks/useDocumentTransmittal.ts
 * Main hook for the Document Transmittal module UI.
 * Bridges the UI components to the local Next.js API routes.
 */
export const useDocumentTransmittal = () => {
    // List State
    const [transmittals, setTransmittals] = useState<DocumentTransmittalListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detail State
    const [selectedTransmittal, setSelectedTransmittal] = useState<DocumentTransmittalHeader | null>(null);
    const [selectedDetails, setSelectedDetails] = useState<DocumentTransmittalDetail[]>([]);
    const [transmittalStatus, setTransmittalStatus] = useState<TransmittalStatus | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);

    // Action State
    const [isAcknowledging, setIsAcknowledging] = useState(false);

    /**
     * Fetches the master list of transmittals.
     */
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/ic/document-transmittal");
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
    }, []);

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

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        // List
        transmittals,
        isLoading,
        error,
        refresh,

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
