import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckSquare, User } from "lucide-react";
import { Combobox } from "./Combobox";
import { DataTable } from "@/components/ui/new-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

interface PendingDetail {
    id: number;
    receivedAt?: string | null;
    document_transmittal_id?: {
        id: number;
        document_transmittal_no?: string;
        receiver_id?: {
            user_fname: string;
            user_lname: string;
        } | null;
    } | null;
    invoice_id: {
        invoice_id: number;
        invoice_no: string;
        invoice_date: string | null;
        net_amount: number;
        customer_code: string;
    };
}

interface BulkAcknowledgeModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    availableUsers: { label: string; value: string }[];
    onBulkAcknowledge: (details: { id: number; headerId: number | null }[], assignedUserId: number) => Promise<boolean>;
    isAcknowledging: boolean;
}

export const BulkAcknowledgeModal = ({
    isOpen,
    onOpenChange,
    availableUsers,
    onBulkAcknowledge,
    isAcknowledging
}: BulkAcknowledgeModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [pendingDetails, setPendingDetails] = useState<PendingDetail[]>([]);
    const [selectedRows, setSelectedRows] = useState<PendingDetail[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const fetchPending = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ic/document-transmittal/pending");
            const data = await res.json();
            if (data.success) {
                setPendingDetails(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch pending details", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchPending();
            setSelectedRows([]);
            setSelectedUserId("");
        }
    }, [isOpen, fetchPending]);

    const handleConfirm = async () => {
        if (selectedRows.length === 0 || !selectedUserId) return;
        
        const payload = selectedRows.map(row => ({
            id: row.id, // post_dispatch_invoices.id
            headerId: row.document_transmittal_id?.id || null,
            salesInvoiceId: row.invoice_id.invoice_id // actual sales_invoice PK
        }));

        const success = await onBulkAcknowledge(payload, parseInt(selectedUserId));
        if (success) {
            onOpenChange(false);
        }
    };

    const columns: ColumnDef<PendingDetail>[] = React.useMemo(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                        onCheckedChange={(value) => {
                            table.toggleAllPageRowsSelected(!!value);
                            if (value) {
                                setSelectedRows(table.getRowModel().rows.map((row) => row.original));
                            } else {
                                setSelectedRows([]);
                            }
                        }}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => {
                            row.toggleSelected(!!value);
                            if (value) {
                                setSelectedRows((prev) => [...prev, row.original]);
                            } else {
                                setSelectedRows((prev) => prev.filter((r) => r.id !== row.original.id));
                            }
                        }}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "invoice_id.invoice_no",
                header: "Invoice No.",
            },
            {
                accessorKey: "invoice_id.invoice_date",
                header: "Invoice Date",
                cell: ({ row }) => {
                    const date = row.original.invoice_id.invoice_date;
                    return date ? new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric"
                    }) : "—";
                }
            },
            {
                accessorKey: "invoice_id.customer_code",
                header: "Customer",
            },
            {
                accessorKey: "invoice_id.net_amount",
                header: "Amount",
                cell: ({ row }) => {
                    const amount = parseFloat(row.original.invoice_id.net_amount.toString() || "0");
                    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                },
            },
        ],
        []
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden bg-background border-border/40 shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/20">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Manage Your Pending Receipts
                    </DialogTitle>
                    <DialogDescription>
                        Acknowledge or reassign invoices currently assigned to you.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold leading-none">Who will acknowledge?</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Select the user who will take ownership of these receipts</p>
                                </div>
                            </div>
                            <Combobox
                                options={availableUsers}
                                value={selectedUserId}
                                onValueChange={setSelectedUserId}
                                placeholder="Search system users..."
                                className="w-full"
                            />
                        </div>

                        <DataTable
                            columns={columns}
                            data={pendingDetails}
                            isLoading={isLoading}
                            searchKey="invoice_id_invoice_no"
                            emptyTitle="No pending invoices"
                            emptyDescription="The pending queue is currently empty."
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-muted/20 sm:justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {selectedRows.length} invoice(s) selected
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button 
                            disabled={selectedRows.length === 0 || !selectedUserId || isAcknowledging}
                            onClick={handleConfirm}
                            className="font-bold min-w-[200px]"
                        >
                            {isAcknowledging ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckSquare className="mr-2 h-4 w-4" />
                            )}
                            Confirm & Acknowledge
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
