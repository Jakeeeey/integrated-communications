import { 
    DocumentTransmittalListItem, 
    TransmittalStatus 
} from "@/modules/integrated-communications/document-transmittal/types/document-transmittal.types";

/**
 * src/modules/integrated-communications/document-transmittal/services/document-transmittal.helpers.ts
 * Pure TypeScript utility functions for the Document Transmittal module.
 *
 * All functions here work with the RAW Directus response shapes,
 * transforming them into the clean typed interfaces the UI expects.
 */

/** Shape of a user object as returned by Directus FK join on sender_id / receiver_id */
interface DirectusUserJoin {
    user_id: number;
    user_fname: string;
    user_mname: string | null;
    user_lname: string;
}

/** Shape of a raw header as returned by the list query */
interface DirectusHeaderRaw {
    id: number;
    document_transmittal_no: string | null;
    sender_id: DirectusUserJoin | number | null;
    receiver_id: DirectusUserJoin | number | null;
    createdAt: string | null;
    receivedAt: string | null;
}

/** Shape of a raw detail as returned by Directus */
interface DirectusDetailRaw {
    id: number;
    document_transmittal_id: number;
    invoice_id: Record<string, unknown> | number | null;
    receivedAt: string | null;
}

/**
 * Formats a user's full name from their Directus join fields.
 * Gracefully handles null/missing middle name and non-joined (numeric) FK values.
 */
export function formatUserFullName(user: DirectusUserJoin | number | null): string {
    if (!user || typeof user === "number") return "Unknown";
    const parts = [user.user_fname, user.user_mname, user.user_lname];
    return parts
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .join(" ");
}

/**
 * Derives the overall status of a transmittal.
 */
export function deriveTransmittalStatus(
    headerReceivedAt: string | null,
    totalDetails: number,
    acknowledgedCount: number
): TransmittalStatus {
    if (headerReceivedAt || (totalDetails > 0 && acknowledgedCount === totalDetails)) {
        return "Fully Received";
    }
    if (acknowledgedCount > 0) {
        return "Partially Received";
    }
    return "Pending";
}

/**
 * Maps a raw Directus header + separately-fetched detail counts into a list item.
 * Used by the Service when building the masterlist.
 */
export function mapHeaderToListItem(
    header: DirectusHeaderRaw,
    totalInvoices: number,
    acknowledgedInvoices: number,
): DocumentTransmittalListItem {
    return {
        id: header.id,
        documentTransmittalNo: header.document_transmittal_no || "N/A",
        senderName: formatUserFullName(header.sender_id as DirectusUserJoin | number | null),
        receiverName: formatUserFullName(header.receiver_id as DirectusUserJoin | number | null),
        createdAt: header.createdAt,
        receivedAt: header.receivedAt,
        totalInvoices,
        acknowledgedInvoices,
        status: deriveTransmittalStatus(header.receivedAt, totalInvoices, acknowledgedInvoices),
    };
}
