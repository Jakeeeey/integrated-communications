"use client";

import React from "react";
import { useDocumentTransmittal } from "@/modules/integrated-communications/document-transmittal/hooks/useDocumentTransmittal";
import { DataTable } from "@/components/ui/new-data-table";
import { getDocumentTransmittalColumns } from "@/modules/integrated-communications/document-transmittal/components/DocumentTransmittalColumns";
import { TransmittalDetailModal } from "@/modules/integrated-communications/document-transmittal/components/TransmittalDetailModal";
import { ClipboardCheck, RefreshCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * src/modules/integrated-communications/document-transmittal/DocumentTransmittalPage.tsx
 * Main page for the Document Transmittal module.
 */
export default function DocumentTransmittalPage() {
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
        isAcknowledging
    } = useDocumentTransmittal();

    const columns = React.useMemo(() => getDocumentTransmittalColumns(fetchDetail), [fetchDetail]);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <ClipboardCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Document Transmittal</h1>
                            <p className="text-sm text-muted-foreground">Manage and acknowledge transmittals for post-dispatch invoices.</p>
                        </div>
                    </div>
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

            {/* Error State */}
            {error && (
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <DataTable
                columns={columns}
                data={transmittals}
                isLoading={isLoading}
                searchKey="documentTransmittalNo"
                emptyTitle="No transmittals found"
                emptyDescription="You don't have any document transmittals awaiting acknowledgment at this time."
            />

            {/* Detail Modal */}
            <TransmittalDetailModal
                isOpen={isDetailModalOpen}
                onOpenChange={setDetailModalOpen}
                header={selectedTransmittal}
                details={selectedDetails}
                status={transmittalStatus}
                isLoading={isDetailLoading}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={isAcknowledging}
            />
        </div>
    );
}
