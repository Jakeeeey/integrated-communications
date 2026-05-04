"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DocumentTransmittalListItem } from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.types";
import { StatusBadge, StatusTone } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

/**
 * Column definitions for the Document Transmittal master list table.
 * @param onView Callback to open the detail modal
 */
export const getDocumentTransmittalColumns = (
    onView: (id: number) => void
): ColumnDef<DocumentTransmittalListItem>[] => [
    {
        accessorKey: "documentTransmittalNo",
        header: "Transmittal No.",
        cell: ({ row }) => (
            <span className="font-mono font-bold text-foreground">
                {row.getValue("documentTransmittalNo")}
            </span>
        ),
    },
    {
        accessorKey: "senderName",
        header: "Sender",
    },
    {
        accessorKey: "receiverName",
        header: "Receiver",
    },
    {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => {
            const date = row.getValue("createdAt") as string;
            return date ? formatDateTime(new Date(date)) : "—";
        },
    },
    // {
    //     accessorKey: "invoices",
    //     header: "Progress",
    //     cell: ({ row }) => {
    //         const { acknowledgedInvoices, totalInvoices } = row.original;
    //         return (
    //             <div className="flex items-center gap-2">
    //                 <span className="text-xs font-medium text-muted-foreground">
    //                     {acknowledgedInvoices} / {totalInvoices}
    //                 </span>
    //                 <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
    //                     <div 
    //                         className="h-full bg-primary transition-all duration-500" 
    //                         style={{ width: `${(acknowledgedInvoices / totalInvoices) * 100}%` }}
    //                     />
    //                 </div>
    //             </div>
    //         );
    //     },
    // },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            let tone: StatusTone = "neutral";
            
            if (status === "Fully Received") tone = "success";
            else if (status === "Partially Received") tone = "info";
            else if (status === "Pending") tone = "warning";

            return <StatusBadge tone={tone}>{status}</StatusBadge>;
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={() => onView(row.original.id)}
            >
                <Eye className="h-4 w-4" />
                <span className="sr-only">View Details</span>
            </Button>
        ),
    },
];
