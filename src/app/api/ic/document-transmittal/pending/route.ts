import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DocumentTransmittalRepo } from "@/modules/integrated-communications/document-transmittal/services/document-transmittal.repo";
import { decodeJwtPayload } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

/**
 * GET /api/ic/document-transmittal/pending
 * Fetches all pending transmittal details assigned to the logged-in user.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Authentication required" },
                { status: 401 }
            );
        }

        const payload = decodeJwtPayload(token);
        const userId = payload?.sub ? parseInt(payload.sub) : undefined;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Invalid user token" },
                { status: 401 }
            );
        }

        const response = await DocumentTransmittalRepo.fetchPendingDetails(userId);

        return NextResponse.json({
            success: true,
            data: response.data || []
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch pending transmittals";
        console.error("[API] Error fetching pending transmittals:", error);
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
