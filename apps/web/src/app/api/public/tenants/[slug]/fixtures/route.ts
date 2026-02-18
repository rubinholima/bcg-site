import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenants/:slug/fixtures
 * Próximos jogos do tenant (módulo Próximos Jogos).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "Slug é obrigatório" }, { status: 400 });
  }
  return forwardRequest(_request, `/public/tenants/${encodeURIComponent(slug)}/fixtures`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
