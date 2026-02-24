import { NextRequest, NextResponse } from "next/server";

/**
 * GET /auth/login — redireciona para a tela de login (email/senha).
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next")?.trim();
  const url = new URL("/login", request.url);
  if (next?.startsWith("/")) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}
