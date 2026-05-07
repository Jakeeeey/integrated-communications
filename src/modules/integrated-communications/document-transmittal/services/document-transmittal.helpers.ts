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
export interface DirectusUserJoin {
    user_id: number;
    user_fname: string;
    user_mname: string | null;
    user_lname: string;
}

/** Shape of a raw header as returned by the list query */
export interface DirectusHeaderRaw {
    id: number;
    document_transmittal_no: string | null;
    sender_id: DirectusUserJoin | number | null;
    receiver_id: DirectusUserJoin | number | null;
    createdAt: string | null;
    receivedAt: string | null;
}

/** Shape of a raw detail as returned by Directus */
export interface DirectusDetailRaw {
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
    if (!user || typeof user === "number") return "Not specified";
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
    if (totalDetails > 0) {
        if (acknowledgedCount === totalDetails) return "Fully Received";
        if (acknowledgedCount > 0) return "Partially Received";
    }
    
    if (headerReceivedAt) return "Fully Received";
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
    const getUserId = (user: DirectusUserJoin | number | null) => 
        (user && typeof user === "object") ? user.user_id : (typeof user === "number" ? user : null);

    return {
        id: header.id,
        documentTransmittalNo: header.document_transmittal_no || "-",
        senderId: getUserId(header.sender_id),
        receiverId: getUserId(header.receiver_id),
        senderName: formatUserFullName(header.sender_id as DirectusUserJoin | number | null),
        receiverName: formatUserFullName(header.receiver_id as DirectusUserJoin | number | null),
        createdAt: header.createdAt,
        receivedAt: header.receivedAt,
        totalInvoices,
        acknowledgedInvoices,
        status: deriveTransmittalStatus(header.receivedAt, totalInvoices, acknowledgedInvoices),
    };
}

/**
 * Generates the next transmittal number based on the current highest.
 * Example: "DT-00271" -> "DT-00272"
 */
export function getNextTransmittalNo(currentNo: string | null): string {
    const DEFAULT_NO = "DT-00001";
    if (!currentNo) return DEFAULT_NO;

    const parts = currentNo.split("-");
    if (parts.length < 2) return DEFAULT_NO;

    const prefix = parts[0];
    const numericPart = parseInt(parts[1]);

    if (isNaN(numericPart)) return DEFAULT_NO;

    const nextNumeric = numericPart + 1;
    // Pad with zeros to maintain 5-digit format
    const paddedNumeric = nextNumeric.toString().padStart(5, "0");

    return `${prefix}-${paddedNumeric}`;
}
