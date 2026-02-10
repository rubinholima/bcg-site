import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  try {
    const res = await fetch(
      `${apiUrl}/public/tenants?type=${encodeURIComponent(type)}&limit=${encodeURIComponent(limit)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Erro ao carregar tenants" },
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
