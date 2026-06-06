"use client";

import React from "react";
import { useDocumentTransmittal } from "@/modules/integrated-communications/document-transmittal/hooks/useDocumentTransmittal";
import { DataTable } from "@/components/ui/new-data-table";
import { getDocumentTransmittalColumns } from "@/modules/integrated-communications/document-transmittal/components/data-table/DocumentTransmittalColumns";
import { TransmittalDetailModal } from "@/modules/integrated-communications/document-transmittal/components/modals/TransmittalDetailModal";
import { RefreshCcw, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DocumentTransmittalFilters } from "@/modules/integrated-communications/document-transmittal/components/filters/DocumentTransmittalFilters";
import { BulkAcknowledgeModal } from "@/modules/integrated-communications/document-transmittal/components/modals/BulkAcknowledgeModal";
import { DocumentTransmittalFilterProvider } from "./context/DocumentTransmittalFilterContext";

/**
 * src/modules/integrated-communications/document-transmittal/DocumentTransmittalPage.tsx
 * Main content component that consumes hooks and context.
 */
function DocumentTransmittalContent({ currentUser }: { currentUser?: { name: string; email: string } }) {
    const {
        transmittals,
        isLoading,
        error,
        refresh,
        fetchDetail,
        selectedTransmittal,
        selectedDetails,
        transmittalStatus,
        isDetailLoading,
        isDetailModalOpen,
        setDetailModalOpen,
        handleAcknowledge,
        isAcknowledging,
        handleBulkAcknowledge,
        isBulkAcknowledging,
        isBulkModalOpen,
        setIsBulkModalOpen,
        availableSenders,
        availableReceivers,
        allUsers,
    } = useDocumentTransmittal();

    const columns = React.useMemo(() => getDocumentTransmittalColumns(fetchDetail), [fetchDetail]);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Document Transmittal</h1>
                            <p className="text-sm text-muted-foreground">Manage and acknowledge transmittals for post-dispatch invoices.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => setIsBulkModalOpen(true)}
                            className="gap-2 rounded-lg font-bold shadow-sm"
                        >
                            <Send className="h-4 w-4" />
                            Send
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => refresh()} 
                            disabled={isLoading}
                            className="gap-2 rounded-lg"
                        >
                            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            Refresh List
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Filter Section */}
            <DocumentTransmittalFilters 
                availableSenders={availableSenders}
                availableReceivers={availableReceivers}
                isLoading={isLoading}
            />

            {/* Main Content */}
            <DataTable
                columns={columns}
                data={transmittals}
                isLoading={isLoading}
                searchKey="documentTransmittalNo"
                emptyTitle="No transmittals found"
                emptyDescription="No transmittals match your current filter criteria."
            />

            {/* Detail Modal */}
            <TransmittalDetailModal
                key={selectedTransmittal?.id || "detail-modal"}
                isOpen={isDetailModalOpen}
                onOpenChange={setDetailModalOpen}
                header={selectedTransmittal}
                details={selectedDetails}
                status={transmittalStatus}
                isLoading={isDetailLoading}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={isAcknowledging}
                currentUser={currentUser}
            />

            {/* Global Bulk Acknowledge Modal */}
            <BulkAcknowledgeModal
                isOpen={isBulkModalOpen}
                onOpenChange={setIsBulkModalOpen}
                onBulkAcknowledge={handleBulkAcknowledge}
                isAcknowledging={isBulkAcknowledging}
                availableUsers={allUsers}
                currentUser={currentUser}
            />
        </div>
    );
}

/**
 * Main entry point wrapped with necessary providers.
 */
export default function DocumentTransmittalPage({ currentUser }: { currentUser?: { name: string; email: string } }) {
    return (
        <DocumentTransmittalFilterProvider>
            <DocumentTransmittalContent currentUser={currentUser} />
        </DocumentTransmittalFilterProvider>
    );
}
