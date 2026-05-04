import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DocumentTransmittalService } from "@/modules/integrated-communications/document-transmittal/services";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

/**
 * GET /api/ic/document-transmittal/[id]
 * Fetches detail for a single transmittal.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const data = await DocumentTransmittalService.getTransmittalDetail(parseInt(id));
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error(`[API][DocumentTransmittal] GET Detail Error:`, error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch details" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/ic/document-transmittal/[id]?action=acknowledge
 * Acknowledges specific invoices within a transmittal.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const searchParams = req.nextUrl.searchParams;
        const action = searchParams.get("action");

        if (action !== "acknowledge") {
            return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { detailIds } = body;

        const result = await DocumentTransmittalService.acknowledgeTransmittal(parseInt(id), detailIds);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error) {
        console.error(`[API][DocumentTransmittal] PATCH Error:`, error);
        return NextResponse.json(
            { success: false, message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
