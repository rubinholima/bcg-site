import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  try {
    const res = await fetch(
      `${apiUrl}/public/tenants/${encodeURIComponent(slug)}/fixtures`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Erro ao carregar jogos" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}
