import { NextRequest, NextResponse } from "next/server";

/**
 * Callback Cognito removido — login agora é email/senha.
 * Redireciona qualquer acesso para a tela de login.
 */
export async function GET(request: NextRequest) {
  const url = new URL("/login", request.url);
  const next = request.nextUrl.searchParams.get("state") || request.nextUrl.searchParams.get("next");
  if (next?.startsWith("/")) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}
