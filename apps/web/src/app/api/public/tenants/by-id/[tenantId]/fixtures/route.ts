import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenants/by-id/:tenantId/fixtures
 * Próximos jogos do tenant pelo ID. Usado pelo módulo Logística (evita dependência do slug).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  if (!tenantId?.trim()) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }
  return forwardRequest(_request, `/public/tenants/by-id/${encodeURIComponent(tenantId)}/fixtures`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
