import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenants/:slug/players
 * Jogadores do clube agrupados por categoria (módulo Times por Categorias).
 * Só retorna jogadores com teamPage visível (publicFields.teamPage !== false).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "Slug é obrigatório" }, { status: 400 });
  }
  return forwardRequest(_request, `/public/tenants/${encodeURIComponent(slug)}/players`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
