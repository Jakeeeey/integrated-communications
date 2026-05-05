import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DocumentTransmittalRepo } from "@/modules/integrated-communications/document-transmittal/services/document-transmittal.repo";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

/**
 * GET /api/ic/document-transmittal/users
 * Fetches all users for the acknowledgment dropdown.
 */
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Authentication required" },
                { status: 401 }
            );
        }

        const response = await DocumentTransmittalRepo.fetchAllUsers();

        return NextResponse.json({
            success: true,
            data: response.data || []
        });

    } catch (error: any) {
        console.error("[API] Error fetching users:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Failed to fetch users" },
            { status: 500 }
        );
    }
}
