import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Sempre buscar dados frescos do backend (cores do header, etc.). */
export const dynamic = "force-dynamic";

/**
 * GET /api/public/group-home
 * Retorna a página da Home do Grupo (BCG). Público, sem autenticação.
 * Usado pela rota "/" para renderizar o builder.
 */
export async function GET() {
  try {
    const res = await fetch(`${apiUrl}/public/group-home`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json(null);
    const text = await res.text();
    const trimmed = (text ?? "").trim();
    if (!trimmed) return NextResponse.json(null);
    try {
      const data = JSON.parse(trimmed);
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      });
    } catch {
      return NextResponse.json(null);
    }
  } catch {
    return NextResponse.json(
      { error: "api_unavailable" },
      { status: 503 }
    );
  }
}
