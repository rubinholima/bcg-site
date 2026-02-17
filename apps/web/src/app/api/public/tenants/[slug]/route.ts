import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tenants/:slug
 * Dados públicos do tenant (nome, logo) pelo slug. Usado por Últimos Resultados / Próximos Jogos quando page.tenant não vem.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "Slug é obrigatório" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${apiUrl}/public/tenants/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json(null, { status: 404 });
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Erro ao carregar tenant" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}
