import { DocumentTransmittalRepo } from "./document-transmittal.repo";
import { 
    mapHeaderToListItem, 
    deriveTransmittalStatus,
    formatUserFullName
} from "./document-transmittal.helpers";
import { 
    AcknowledgeSchema 
} from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.schema";
import { 
    DocumentTransmittalListItem, 
    DocumentTransmittalHeader, 
    DocumentTransmittalDetail 
} from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.types";
import { z } from "zod";

/**
 * src/modules/integrated-communications/document-transmittal/services/document-transmittal.service.ts
 * Orchestration layer for the Document Transmittal module (Directus).
 *
 * This layer transforms raw Directus snake_case responses into the clean
 * PascalCase/camelCase interfaces the UI expects.
 */

export class DocumentTransmittalService {
    /**
     * Retrieves the master list of transmittals with server-side filtering.
     */
    static async getTransmittalList(filters: {
        receiverId?: number;
        senderId?: string | null;
        selectedReceiverId?: string | null;
        status?: string | null;
        dateFrom?: string | null;
        dateTo?: string | null;
    }): Promise<DocumentTransmittalListItem[]> {
        try {
            const headerRes = await DocumentTransmittalRepo.fetchAllTransmittals(filters);
            const rawHeaders = headerRes.data || [];

            // Fetch detail counts for the returned headers
            const allDetailsRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/items/document_transmittal_details?fields=document_transmittal_id,receivedAt&limit=-1`,
                { next: { revalidate: 0 } }
            );
            const allDetailsData = await allDetailsRes.json();
            const allDetails: Array<{ document_transmittal_id: number; receivedAt: string | null }> = allDetailsData.data || [];

            // Build count maps
            const totalMap = new Map<number, number>();
            const ackMap = new Map<number, number>();

            for (const d of allDetails) {
                const hId = d.document_transmittal_id;
                totalMap.set(hId, (totalMap.get(hId) || 0) + 1);
                if (d.receivedAt) {
                    ackMap.set(hId, (ackMap.get(hId) || 0) + 1);
                }
            }

            return rawHeaders.map((header: Record<string, unknown>) => 
                mapHeaderToListItem(
                    header as unknown as Parameters<typeof mapHeaderToListItem>[0],
                    totalMap.get(header.id as number) || 0,
                    ackMap.get(header.id as number) || 0,
                )
            );
        } catch (error) {
            console.error("[DocumentTransmittalService] Error fetching list:", error);
            throw error;
        }
    }

    /**
     * Retrieves full detail for a single transmittal.
     */
    static async getTransmittalDetail(id: number) {
        try {
            // Fetch header and details in parallel
            const [headerRes, detailsRes] = await Promise.all([
                DocumentTransmittalRepo.fetchHeaderById(id),
                DocumentTransmittalRepo.fetchDetailsByHeaderId(id),
            ]);

            const rawHeader = headerRes.data;
            const rawDetails: Array<Record<string, unknown>> = detailsRes.data || [];

            if (!rawHeader) throw new Error("Transmittal not found");

            // Transform raw Directus shape → clean typed interfaces
            const header: DocumentTransmittalHeader = {
                id: rawHeader.id,
                documentTransmittalNo: rawHeader.document_transmittal_no,
                senderId: typeof rawHeader.sender_id === "object" && rawHeader.sender_id !== null ? rawHeader.sender_id.user_id : rawHeader.sender_id,
                receiverId: typeof rawHeader.receiver_id === "object" && rawHeader.receiver_id !== null ? rawHeader.receiver_id.user_id : rawHeader.receiver_id,
                createdAt: rawHeader.createdAt,
                receivedAt: rawHeader.receivedAt,
                sender: typeof rawHeader.sender_id === "object" && rawHeader.sender_id !== null
                    ? { userId: rawHeader.sender_id.user_id, userFname: rawHeader.sender_id.user_fname, userMname: rawHeader.sender_id.user_mname, userLname: rawHeader.sender_id.user_lname }
                    : { userId: 0, userFname: "Not specified", userMname: null, userLname: "" },
                receiver: typeof rawHeader.receiver_id === "object" && rawHeader.receiver_id !== null
                    ? { userId: rawHeader.receiver_id.user_id, userFname: rawHeader.receiver_id.user_fname, userMname: rawHeader.receiver_id.user_mname, userLname: rawHeader.receiver_id.user_lname }
                    : { userId: 0, userFname: "Not specified", userMname: null, userLname: "" },
            };

            const details: DocumentTransmittalDetail[] = rawDetails.map((d) => {
                const inv = d.invoice_id as Record<string, unknown> | null;
                return {
                    id: d.id as number,
                    documentTransmittalId: d.document_transmittal_id as number,
                    invoiceId: inv ? (inv.invoice_id as number) : (d.invoice_id as number),
                    receivedAt: d.receivedAt as string | null,
                    invoice: inv ? {
                        invoiceId: inv.invoice_id as number,
                        orderId: (inv.order_id as string) ?? null,
                        customerCode: (inv.customer_code as string) ?? null,
                        invoiceNo: (inv.invoice_no as string) ?? null,
                        salesmanId: (inv.salesman_id as number) ?? null,
                        branchId: (inv.branch_id as number) ?? null,
                        invoiceDate: (inv.invoice_date as string) ?? null,
                        dispatchDate: (inv.dispatch_date as string) ?? null,
                        dueDate: (inv.due_date as string) ?? null,
                        paymentTerms: (inv.payment_terms as number) ?? null,
                        transactionStatus: (inv.transaction_status as string) ?? null,
                        paymentStatus: (inv.payment_status as string) ?? null,
                        totalAmount: (inv.total_amount as number) ?? null,
                        salesType: (inv.sales_type as number) ?? null,
                        invoiceType: (inv.invoice_type as number) ?? null,
                        priceType: (inv.price_type as string) ?? null,
                        vatAmount: (inv.vat_amount as number) ?? null,
                        grossAmount: (inv.gross_amount as number) ?? null,
                        discountAmount: (inv.discount_amount as number) ?? null,
                        netAmount: (inv.net_amount as number) ?? null,
                        createdBy: null, createdDate: null, modifiedBy: null, modifiedDate: null,
                        postedBy: null, postedDate: null, remarks: (inv.remarks as string) ?? null,
                        isReceipt: null, isPosted: null, isDispatched: null, isRemitted: null, isReplaced: null,
                    } : {
                        invoiceId: d.invoice_id as number,
                        orderId: null, customerCode: null, invoiceNo: null, salesmanId: null,
                        branchId: null, invoiceDate: null, dispatchDate: null, dueDate: null,
                        paymentTerms: null, transactionStatus: null, paymentStatus: null,
                        totalAmount: null, salesType: null, invoiceType: null, priceType: null,
                        vatAmount: null, grossAmount: null, discountAmount: null, netAmount: null,
                        createdBy: null, createdDate: null, modifiedBy: null, modifiedDate: null,
                        postedBy: null, postedDate: null, remarks: null,
                        isReceipt: null, isPosted: null, isDispatched: null, isRemitted: null, isReplaced: null,
                    },
                };
            });

            const acknowledgedCount = details.filter(d => d.receivedAt !== null).length;
            const status = deriveTransmittalStatus(header.receivedAt, details.length, acknowledgedCount);

            return { header, details, status };
        } catch (error) {
            console.error(`[DocumentTransmittalService] Error fetching detail for ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Acknowledges invoices and auto-stamps header when complete.
     */
    static async acknowledgeTransmittal(id: number, detailIds: number[]) {
        try {
            AcknowledgeSchema.parse({ detailIds });

            await DocumentTransmittalRepo.acknowledgeDetails(detailIds);

            // Re-fetch to check if all details are now acknowledged
            const updated = await this.getTransmittalDetail(id);
            const allDone = updated.details.every(d => d.receivedAt !== null);

            if (allDone) {
                await DocumentTransmittalRepo.stampHeaderReceived(id);
            }

            return { success: true, message: "Invoices acknowledged successfully" };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    message: "Validation failed: " + error.issues.map((e: z.ZodIssue) => e.message).join(", ")
                };
            }
            console.error(`[DocumentTransmittalService] Acknowledge error:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred"
            };
        }
    }
}
