/**
 * src/modules/integrated-communications/document-transmittal/services/document-transmittal.repo.ts
 * Repository layer for the Document Transmittal module.
 * Calls Directus REST API directly (public read, token write).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

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

export class DocumentTransmittalRepo {
    /**
     * Fetches document transmittal headers with sender/receiver names.
     * Optionally filters by receiverId to show only transmittals assigned to the current user.
     */
    static async fetchAllTransmittals(receiverId?: number) {
        const fields = [
            "*",
            "sender_id.user_id", "sender_id.user_fname", "sender_id.user_mname", "sender_id.user_lname",
            "receiver_id.user_id", "receiver_id.user_fname", "receiver_id.user_mname", "receiver_id.user_lname",
        ].join(",");

        let url = `${API_BASE_URL}/items/document_transmittal_header?fields=${fields}&sort=-id&limit=-1`;

        if (receiverId) {
            console.log("[REPO] Fetching transmittals for Receiver ID:", receiverId);
            const filter = encodeURIComponent(JSON.stringify({
                receiver_id: { _eq: receiverId }
            }));
            url += `&filter=${filter}`;
        }

        const response = await fetch(url, {
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
}
