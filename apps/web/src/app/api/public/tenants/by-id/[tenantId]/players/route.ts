import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenants/by-id/:tenantId/players
 * Jogadores do clube pelo ID do tenant — garante o tenant correto da página carregada.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  if (!tenantId?.trim()) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }
  return forwardRequest(_request, `/public/tenants/by-id/${encodeURIComponent(tenantId)}/players`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
