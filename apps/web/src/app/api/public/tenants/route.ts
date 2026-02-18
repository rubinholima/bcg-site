import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenants?type=club|company&limit=50
 * Lista tenants públicos para carrossel de logos (clubes ou empresas).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const limit = searchParams.get("limit") ?? "50";
  if (type !== "club" && type !== "company") {
    return NextResponse.json(
      { error: 'Query "type" must be "club" or "company"' },
      { status: 400 }
    );
  }
  return forwardRequest(request, "/public/tenants", {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
