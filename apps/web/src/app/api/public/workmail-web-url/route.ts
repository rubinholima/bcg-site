import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";

/**
 * GET /api/public/workmail-web-url?slug=...
 * Retorna a URL do cliente web WorkMail (tela de login do usuário) para o tenant.
 * Público, sem autenticação.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ url: null });
  }
  try {
    const res = await fetch(
      buildBackendUrl(`/public/workmail-web-url?slug=${encodeURIComponent(slug)}`),
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ url: null });
    }
    const data = (await res.json()) as { url: string | null };
    return NextResponse.json({ url: data?.url ?? null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
