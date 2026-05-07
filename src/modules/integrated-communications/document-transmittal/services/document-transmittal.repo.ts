/**
 * src/modules/integrated-communications/document-transmittal/services/document-transmittal.repo.ts
 * Repository layer for the Document Transmittal module.
 * Calls Directus REST API directly (public read, token write).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

/**
 * Directus response shape:
 *
 * Header: { id, document_transmittal_no, sender_id, receiver_id, createdAt, receivedAt }
 *   - sender_id JOIN user → { user_id, user_fname, user_mname, user_lname }
 *   - receiver_id JOIN user → { user_id, user_fname, user_mname, user_lname }
 *
 * Details: { id, document_transmittal_id, invoice_id, receivedAt }
 *   - invoice_id JOIN sales_invoice → { invoice_id, invoice_no, customer_code, net_amount, ... }
 */

interface DirectusError {
    message: string;
    extensions?: {
        code: string;
    };
}

interface DirectusErrorResponse {
    errors?: DirectusError[];
    message?: string;
}

export class DocumentTransmittalRepo {
    /**
     * Fetches document transmittal headers with complex server-side filtering.
     */
    static async fetchAllTransmittals(filters: {
        receiverId?: number;
        senderId?: string | null;
        selectedReceiverId?: string | null;
        status?: string[] | null;
        dateFrom?: string | null;
        dateTo?: string | null;
    }) {
        const fields = [
            "*",
            "sender_id.user_id", "sender_id.user_fname", "sender_id.user_mname", "sender_id.user_lname",
            "receiver_id.user_id", "receiver_id.user_fname", "receiver_id.user_mname", "receiver_id.user_lname",
        ].join(",");

        let url = `${API_BASE_URL}/items/document_transmittal_header?fields=${fields}&sort=-id&limit=-1`;

        const filterObj: { _and: Record<string, unknown>[] } = { _and: [] };

        // Logged-in user is usually the receiver
        if (filters.receiverId) {
            filterObj._and.push({ receiver_id: { _eq: filters.receiverId } });
        }

        if (filters.senderId) {
            filterObj._and.push({ sender_id: { _eq: parseInt(filters.senderId) } });
        }

        if (filters.selectedReceiverId) {
            filterObj._and.push({ receiver_id: { _eq: parseInt(filters.selectedReceiverId) } });
        }

        if (filters.dateFrom) {
            filterObj._and.push({ createdAt: { _gte: filters.dateFrom } });
        }
        if (filters.dateTo) {
            filterObj._and.push({ createdAt: { _lte: filters.dateTo } });
        }

        if (filterObj._and.length > 0) {
            url += `&filter=${encodeURIComponent(JSON.stringify(filterObj))}`;
        }

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
            },
            next: { revalidate: 0 },
        });

        if (!response.ok) {
            throw new Error(`REPO_ERROR: Failed to fetch transmittals (${response.status})`);
        }

        return await response.json();
    }

    /**
     * Fetches detail rows for a specific header, joining invoice data.
     */
    static async fetchDetailsByHeaderId(headerId: number) {
        const fields = [
            "*",
            "invoice_id.invoice_id", "invoice_id.invoice_no", "invoice_id.order_id",
            "invoice_id.customer_code", "invoice_id.net_amount", "invoice_id.gross_amount",
            "invoice_id.total_amount", "invoice_id.vat_amount", "invoice_id.discount_amount",
            "invoice_id.invoice_date", "invoice_id.dispatch_date", "invoice_id.due_date",
            "invoice_id.transaction_status", "invoice_id.payment_status",
            "invoice_id.salesman_id", "invoice_id.branch_id", "invoice_id.remarks",
        ].join(",");

        const filter = encodeURIComponent(JSON.stringify({
            document_transmittal_id: { _eq: headerId }
        }));

        const url = `${API_BASE_URL}/items/document_transmittal_details?fields=${fields}&filter=${filter}&limit=-1`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
            },
            next: { revalidate: 0 },
        });

        if (!response.ok) {
            throw new Error(`REPO_ERROR: Failed to fetch details for header ${headerId} (${response.status})`);
        }

        return await response.json();
    }

    /**
     * Fetches a single header by ID with full user joins.
     */
    static async fetchHeaderById(headerId: number) {
        const fields = [
            "*",
            "sender_id.user_id", "sender_id.user_fname", "sender_id.user_mname", "sender_id.user_lname",
            "receiver_id.user_id", "receiver_id.user_fname", "receiver_id.user_mname", "receiver_id.user_lname",
        ].join(",");

        const url = `${API_BASE_URL}/items/document_transmittal_header/${headerId}?fields=${fields}`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
            },
            next: { revalidate: 0 },
        });

        if (!response.ok) {
            throw new Error(`REPO_ERROR: Failed to fetch header ${headerId} (${response.status})`);
        }

        return await response.json();
    }

    /**
     * Batch-updates detail rows to stamp receivedAt.
     * Requires auth token for write operations.
     */
    static async acknowledgeDetails(detailIds: number[]) {
        const url = `${API_BASE_URL}/items/document_transmittal_details`;

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                keys: detailIds,
                data: {
                    receivedAt: new Date().toISOString(),
                },
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`REPO_ERROR: ${(err as Record<string, string>).message || "Failed to acknowledge"}`);
        }

        return await response.json();
    }

    /**
     * Stamps the header as fully received.
     */
    static async stampHeaderReceived(headerId: number) {
        const url = `${API_BASE_URL}/items/document_transmittal_header/${headerId}`;

        await fetch(url, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                receivedAt: new Date().toISOString(),
            }),
        });
    }
    /**
     * Creates a new document transmittal header.
     * Used when splitting a transmittal to reassign receipts to a different user.
     */
    static async createHeader(data: { sender_id: number; receiver_id: number; document_transmittal_no: string | null }) {
        const url = `${API_BASE_URL}/items/document_transmittal_header`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`REPO_ERROR: ${(err as Record<string, string>).message || "Failed to create header"}`);
        }

        return await response.json();
    }

    /**
     * Creates new detail rows.
     */
    static async createDetails(details: { document_transmittal_id: number; invoice_id: number }[]) {
        const url = `${API_BASE_URL}/items/document_transmittal_details`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(details),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({})) as DirectusErrorResponse;
            const errorMessage = err.errors?.[0]?.message || err.message || "Failed to create details";
            throw new Error(`REPO_ERROR: ${errorMessage}`);
        }

        return await response.json();
    }

    /**
     * Batch-updates detail rows to point to a new header ID.
     * Used when reassigning selected receipts.
     */
    static async reassignDetails(detailIds: number[], newHeaderId: number) {
        const url = `${API_BASE_URL}/items/document_transmittal_details`;

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${STATIC_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                keys: detailIds,
                data: {
                    document_transmittal_id: newHeaderId,
                },
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`REPO_ERROR: ${(err as Record<string, string>).message || "Failed to reassign details"}`);
        }

        return await response.json();
    }

    /**
     * Fetches pending invoices assigned to a user from the post_dispatch_invoices table.
     */
    static async fetchPendingDetails(receiverId?: number) {
        const fields = [
            "id",
            "invoiceAt",
            "isCleared",
            "status",
            "invoice_id.*" // Join everything from sales_invoice
        ].join(",");

        let url = `${API_BASE_URL}/items/post_dispatch_invoices?fields=${fields}&limit=-1`;
        
        if (receiverId) {
            // Filter by the user currently holding the invoice
            url += `&filter[invoiceAt][_eq]=${receiverId}`;
        }

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${STATIC_TOKEN}` },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch pending invoices: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetches the latest transmittal number to support incrementing.
     */
    static async fetchLatestTransmittalNo() {
        const url = `${API_BASE_URL}/items/document_transmittal_header?sort=-id&limit=1&fields=document_transmittal_no`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${STATIC_TOKEN}` },
            cache: "no-store",
        });

        if (!response.ok) return null;
        const result = await response.json();
        return result.data?.[0]?.document_transmittal_no || null;
    }

    /**
     * Fetches all users from the user table.
     */
    static async fetchAllUsers() {
        const url = `${API_BASE_URL}/items/user?fields=user_id,user_fname,user_lname&limit=-1&sort=user_fname`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${STATIC_TOKEN}` },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Updates the invoiceAt field in the post_dispatch_invoices table.
     */
    static async updateInvoiceAt(id: number, userId: number) {
        try {
            const url = `${API_BASE_URL}/items/post_dispatch_invoices/${id}`;
            const response = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${STATIC_TOKEN}`
                },
                body: JSON.stringify({ invoiceAt: userId })
            });

            if (!response.ok) throw new Error("Failed to update invoiceAt");
            return { success: true };
        } catch (error) {
            console.error("[Repo] Error updating invoiceAt:", error);
            return { success: false };
        }
    }
}
