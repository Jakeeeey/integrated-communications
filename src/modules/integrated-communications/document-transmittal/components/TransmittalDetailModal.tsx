"use client";

import React, { useState, useMemo, useCallback } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/new-data-table";
import { getTransmittalDetailColumns } from "@/modules/integrated-communications/document-transmittal/components/TransmittalDetailColumns";
import { DocumentTransmittalHeader, DocumentTransmittalDetail, TransmittalStatus } from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, cn } from "@/lib/utils";
import { FileText, User, Calendar, CheckSquare, Loader2 } from "lucide-react";

interface TransmittalDetailModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    header: DocumentTransmittalHeader | null;
    details: DocumentTransmittalDetail[];
    status: TransmittalStatus | null;
    isLoading: boolean;
    onAcknowledge: (id: number, detailIds: number[]) => Promise<boolean>;
    isAcknowledging: boolean;
}

export const TransmittalDetailModal = ({
    isOpen,
    onOpenChange,
    header,
    details,
    status,
    isLoading,
    onAcknowledge,
    isAcknowledging
}: TransmittalDetailModalProps) => {
    const [selectedRows, setSelectedRows] = useState<DocumentTransmittalDetail[]>([]);

    const handleAcknowledgeClick = async () => {
        if (!header) return;
        const ids = selectedRows.map(r => r.id);
        const success = await onAcknowledge(header.id, ids);
        if (success) {
            setSelectedRows([]);
        }
    };

    const handleSelectionChange = useCallback((rows: DocumentTransmittalDetail[]) => {
        setSelectedRows(rows);
    }, []);

    const columns = useMemo(() => getTransmittalDetailColumns(), []);

    const totalInvoices = details.length;
    const acknowledgedCount = details.filter(d => d.receivedAt !== null).length;
    const isFullyAcknowledged = totalInvoices > 0 && acknowledgedCount === totalInvoices;


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-5xl w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-4 bg-muted/30 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <FileText className="h-6 w-6 text-primary" />
                                {header?.documentTransmittalNo || "Transmittal Details"}
                            </DialogTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {header?.createdAt ? formatDateTime(new Date(header.createdAt)) : "—"}
                                </div>
                                {(() => {
                                    let variant: "destructive" | "secondary" | "default" | "outline" = "outline";
                                    if (status === "Pending") variant = "destructive";
                                    else if (status === "Partially Received") variant = "secondary";
                                    else if (status === "Fully Received") variant = "default";
                                    
                                    return <Badge variant={variant}>{status || "Unknown"}</Badge>;
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Sender</label>
                            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-border/50">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{header ? `${header.sender.userFname} ${header.sender.userLname}` : "—"}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Authorized Dispatcher</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Receiver</label>
                            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-border/50">
                                <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-info" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{header ? `${header.receiver.userFname} ${header.receiver.userLname}` : "—"}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Designated Recipient</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden p-6 bg-background">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            Transmittal Invoices
                            <Badge variant="secondary" className="rounded-full px-2 py-0 h-5">
                                {totalInvoices}
                            </Badge>
                        </h3>
                        <div className="flex items-center gap-2">
                            {acknowledgedCount > 0 && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {acknowledgedCount} / {totalInvoices} Acknowledged
                                </Badge>
                            )}
                            {selectedRows.length > 0 && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 animate-in fade-in slide-in-from-right-2">
                                    {selectedRows.length} Invoice(s) Selected
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 relative">
                        <DataTable
                            columns={columns}
                            data={details}
                            isLoading={isLoading}
                            onSelectionChange={handleSelectionChange}
                            searchKey="invoiceNo"
                            emptyTitle="No invoices found"
                            emptyDescription="This transmittal doesn't contain any invoice records."
                        />
                    </div>
                </div>

                <DialogFooter className="p-4 bg-muted/30 border-t flex items-center justify-between sm:justify-between shrink-0">
                    <div className="text-xs font-medium text-muted-foreground">
                        {isFullyAcknowledged ? (
                            <span className="text-green-600 flex items-center gap-1.5">
                                <CheckSquare className="h-3.5 w-3.5" />
                                All invoices have been acknowledged.
                            </span>
                        ) : (
                            <span className="italic">
                                {acknowledgedCount > 0 
                                    ? `${totalInvoices - acknowledgedCount} pending invoices remaining.`
                                    : "Select pending invoices above to acknowledge receipt."
                                }
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button 
                            disabled={selectedRows.length === 0 || isAcknowledging || isFullyAcknowledged}
                            onClick={handleAcknowledgeClick}
                            className={cn(
                                "font-bold transition-all",
                                isFullyAcknowledged 
                                    ? "bg-green-600 hover:bg-green-600 opacity-100 text-white cursor-default" 
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            )}
                        >
                            {isAcknowledging ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : isFullyAcknowledged ? (
                               <CheckSquare className="mr-2 h-4 w-4" />
                            ) : (
                                <CheckSquare className="mr-2 h-4 w-4" />
                            )}
                            {isFullyAcknowledged ? "Acknowledged" : "Acknowledge Receipt"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
