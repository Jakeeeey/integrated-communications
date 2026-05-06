import { DocumentTransmittalRepo } from "./document-transmittal.repo";
import { 
    mapHeaderToListItem, 
    deriveTransmittalStatus,
    DirectusHeaderRaw,
    DirectusDetailRaw
} from "./document-transmittal.helpers";
import { 
    AcknowledgeSchema,
    ReassignSchema
} from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.schema";
import { 
    DocumentTransmittalHeader, 
    DocumentTransmittalDetail, 
    DocumentTransmittalListItem,
    TransmittalStatus 
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
        status?: TransmittalStatus[];
        dateFrom?: string | null;
        dateTo?: string | null;
    }): Promise<DocumentTransmittalListItem[]> {
        try {
            const headerRes = await DocumentTransmittalRepo.fetchAllTransmittals(filters);
            const rawHeaders: DirectusHeaderRaw[] = headerRes.data || [];

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

            const mappedTransmittals = rawHeaders.map((header: DirectusHeaderRaw) => 
                mapHeaderToListItem(
                    header,
                    totalMap.get(header.id) || 0,
                    ackMap.get(header.id) || 0,
                )
            );

            // Post-Fetch Filtering for Status (since status is derived, not a DB column)
            if (filters.status && filters.status.length > 0) {
                return mappedTransmittals.filter((t: DocumentTransmittalListItem) => filters.status!.includes(t.status));
            }

            return mappedTransmittals;
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

            const rawHeader: DirectusHeaderRaw | undefined = headerRes.data;
            const rawDetails: DirectusDetailRaw[] = detailsRes.data || [];

            if (!rawHeader) throw new Error("Transmittal not found");

            // Transform raw Directus shape → clean typed interfaces
            const header: DocumentTransmittalHeader = {
                id: rawHeader.id,
                documentTransmittalNo: rawHeader.document_transmittal_no,
                senderId: (typeof rawHeader.sender_id === "object" && rawHeader.sender_id !== null ? rawHeader.sender_id.user_id : rawHeader.sender_id as number) || 0,
                receiverId: (typeof rawHeader.receiver_id === "object" && rawHeader.receiver_id !== null ? rawHeader.receiver_id.user_id : rawHeader.receiver_id as number) || 0,
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
                    id: d.id,
                    documentTransmittalId: d.document_transmittal_id,
                    invoiceId: inv ? (inv.invoice_id as number) : (d.invoice_id as number),
                    receivedAt: d.receivedAt,
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
     * Handles invoice acknowledgment OR reassignment depending on the target user.
     */
    static async acknowledgeTransmittal(id: number, detailIds: number[], targetUserId?: number, performingUserId?: number) {
        try {
            AcknowledgeSchema.parse({ detailIds });

            let targetHeaderId = id;
            let wasReassigned = false;

            // Determine whether to reassign or acknowledge
            if (targetUserId) {
                const headerRes = await DocumentTransmittalRepo.fetchHeaderById(id);
                const header = headerRes.data;
                if (header) {
                    const currentReceiverId = typeof header.receiver_id === "object" && header.receiver_id !== null 
                        ? header.receiver_id.user_id 
                        : (header.receiver_id as number) || 0;

                    if (currentReceiverId !== targetUserId) {
                        // REASSIGN ONLY — do NOT acknowledge
                        const reassignRes = await this.reassignTransmittal(id, detailIds, targetUserId, performingUserId);
                        if (!reassignRes.success || !reassignRes.newHeaderId) {
                            throw new Error(reassignRes.message || "Failed to reassign invoices");
                        }
                        targetHeaderId = reassignRes.newHeaderId;
                        wasReassigned = true;
                    }
                }
            }

            // Only stamp receivedAt when NOT reassigning to a different user
            if (!wasReassigned) {
                await DocumentTransmittalRepo.acknowledgeDetails(detailIds);

                // Re-fetch to check if all details are now acknowledged
                const updated = await this.getTransmittalDetail(targetHeaderId);
                const allDone = updated.details.every(d => d.receivedAt !== null);

                if (allDone) {
                    await DocumentTransmittalRepo.stampHeaderReceived(targetHeaderId);
                }

                return { success: true, message: "Invoices acknowledged successfully", targetHeaderId };
            }

            // Reassignment-only response
            return { 
                success: true, 
                message: "Invoices reassigned successfully. The new receiver must acknowledge them.", 
                targetHeaderId 
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    message: "Validation failed: " + error.issues.map((e: z.ZodIssue) => e.message).join(", ")
                };
            }
            console.error(`[DocumentTransmittalService] Acknowledge/Reassign error:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred"
            };
        }
    }
    /**
     * Splits a transmittal by reassigning selected details to a new user.
     */
    static async reassignTransmittal(originalHeaderId: number, detailIds: number[], newUserId: number, performingUserId?: number) {
        try {
            ReassignSchema.parse({ detailIds, newUserId });

            // 1. Fetch original header to get the sender_id and document_transmittal_no
            const originalHeaderRes = await DocumentTransmittalRepo.fetchHeaderById(originalHeaderId);
            const originalHeader = originalHeaderRes.data;
            
            if (!originalHeader) throw new Error("Original transmittal not found");

            // Use performingUserId as the new sender, or fallback to original sender
            const newSenderId = performingUserId || (
                typeof originalHeader.sender_id === "object" && originalHeader.sender_id !== null 
                    ? originalHeader.sender_id.user_id 
                    : (originalHeader.sender_id as number) || 0
            );

            // 2. Create the new header — keep the same transmittal number
            const newTransmittalNo = originalHeader.document_transmittal_no || null;
            
            const newHeaderRes = await DocumentTransmittalRepo.createHeader({
                sender_id: newSenderId,
                receiver_id: newUserId,
                document_transmittal_no: newTransmittalNo
            });

            const newHeaderId = newHeaderRes.data.id;

            // 3. Patch the selected detail rows to the new header
            await DocumentTransmittalRepo.reassignDetails(detailIds, newHeaderId);

            // 4. Update the invoiceAt field in post_dispatch_invoices for each invoice
            // Fetch the details to get the post_dispatch_invoice IDs
            const detailsRes = await DocumentTransmittalRepo.fetchDetailsByHeaderId(originalHeaderId);
            const reassignedDetails = (detailsRes.data || []).filter((d: DocumentTransmittalDetail) => detailIds.includes(d.id));

            for (const detail of reassignedDetails) {
                const postDispatchInvoiceId = (detail.invoice as any)?.id || detail.invoiceId;
                if (postDispatchInvoiceId) {
                    await DocumentTransmittalRepo.updateInvoiceAt(postDispatchInvoiceId, newUserId);
                }
            }

            return { 
                success: true, 
                message: "Invoices reassigned successfully",
                newHeaderId 
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "An unexpected error occurred during reassignment";
            console.error("[Service] Error reassigning transmittal:", error);
            return { success: false, message };
        }
    }
    /**
     * Bulks acknowledges (and optionally reassigns) details from potentially multiple original headers.
     * Groups details by their original header ID to preserve sender information.
     */
    static async bulkAcknowledgeWithUser(details: { id: number; headerId: number }[], targetUserId: number, performingUserId?: number) {
        try {
            // Group detail IDs by their original header ID
            const groupedDetails = details.reduce((acc, curr) => {
                if (!acc[curr.headerId]) acc[curr.headerId] = [];
                acc[curr.headerId].push(curr.id);
                return acc;
            }, {} as Record<number, number[]>);

            for (const [headerIdStr, detailIds] of Object.entries(groupedDetails)) {
                const headerId = parseInt(headerIdStr);

                // Acknowledge (and smart-reassign if needed) under each group
                const ackRes = await this.acknowledgeTransmittal(headerId, detailIds, targetUserId, performingUserId);
                if (!ackRes.success) {
                    throw new Error(`Failed to acknowledge some invoices: ${ackRes.message}`);
                }
            }

            return { success: true, message: "Bulk acknowledgment complete" };
        } catch (error) {
            console.error(`[DocumentTransmittalService] Bulk Acknowledge error:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred during bulk acknowledgment"
            };
        }
    }
}
