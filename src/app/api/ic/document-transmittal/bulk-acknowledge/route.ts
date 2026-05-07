import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DocumentTransmittalService } from "@/modules/integrated-communications/document-transmittal/services";
import { decodeJwtPayload } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

/**
 * POST /api/ic/document-transmittal/bulk-acknowledge
 * Body: { details: { id: number, headerId: number }[], newUserId: number }
 */
export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const { details, assignedUserId } = body;

        if (!details || !Array.isArray(details) || details.length === 0) {
            return NextResponse.json(
                { success: false, message: "Invalid payload: Missing details" },
                { status: 400 }
            );
        }

        // Use the assigned user ID or default to the logged-in user
        const result = await DocumentTransmittalService.bulkAcknowledgeWithUser(details, assignedUserId || userId, userId);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to process bulk acknowledge";
        console.error("[API] Error processing bulk acknowledge:", error);
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
