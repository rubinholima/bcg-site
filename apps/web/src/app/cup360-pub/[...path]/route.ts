import { NextRequest, NextResponse } from "next/server";
import { forwardRequest, getAppBaseUrl } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/** Rotas Next-only (não existem direto no Nest em /public/*). */
const NEXT_ONLY_PREFIXES = [
  "noticias-feed",
  "noticias-image",
  "media-asset",
  "group-home",
  "group",
  "group-favicon",
  "boston-city-hall",
  "boston-tv",
  "lead",
  "workmail-web-url",
] as const;

function isNextOnlyPublicPath(path: string): boolean {
  const p = path.replace(/^\/+/, "");
  return NEXT_ONLY_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * Proxy público permitido em domínio customizado (não usa prefixo /api/).
 * Reutiliza a mesma lógica das rotas /api/public/* ou encaminha ao Nest /public/*.
 */
async function handle(request: NextRequest, pathSegments: string[]) {
  const subPath = pathSegments.map((s) => encodeURIComponent(s)).join("/");
  if (!subPath) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  if (isNextOnlyPublicPath(subPath)) {
    const internal = `${getAppBaseUrl().replace(/\/$/, "")}/api/public/${subPath}${request.nextUrl.search}`;
    const method = request.method;
    const headers = new Headers();
    const ct = request.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
    const body =
      method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
    const res = await fetch(internal, { method, headers, body, cache: "no-store" });
    const outHeaders = new Headers();
    const resCt = res.headers.get("content-type");
    if (resCt) outHeaders.set("Content-Type", resCt);
    const cc = res.headers.get("cache-control");
    if (cc) outHeaders.set("Cache-Control", cc);
    return new NextResponse(res.body, { status: res.status, headers: outHeaders });
  }

  return forwardRequest(request, `/public/${subPath}`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return handle(request, path ?? []);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return handle(request, path ?? []);
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return handle(request, path ?? []);
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return handle(request, path ?? []);
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return handle(request, path ?? []);
}
