import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DocumentTransmittalService } from "@/modules/integrated-communications/document-transmittal/services";
import { decodeJwtPayload } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

/**
 * GET /api/ic/document-transmittal
 * Fetches the master list of document transmittals.
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
        console.log("[API] Decoded JWT Payload:", JSON.stringify(payload, null, 2));
        
        const userId = payload?.sub ? parseInt(payload.sub) : undefined;
        console.log("[API] Parsed User ID:", userId);

        const data = await DocumentTransmittalService.getTransmittalList(userId);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("[API][DocumentTransmittal] GET Error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to fetch transmittals" },
            { status: 500 }
        );
    }
}
