import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { forwardRequest, getServerBackendBaseUrl } from "@/lib/apiProxy";
import { pressAccessCookieName } from "@/lib/press-access-cookie";

export const dynamic = "force-dynamic";

/** Público: só { available } — não expõe o token. */
export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return new Response(null, { status: 404 });
  return forwardRequest(_request, `/public/tenants/${encodeURIComponent(slug)}/press/upload-url`, {
    cache: "no-store",
  });
}

/** Token de upload — encaminha cookie de sessão de imprensa. */
export async function POST(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return new Response(null, { status: 404 });
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(pressAccessCookieName(slug))?.value ?? "";
  const base = getServerBackendBaseUrl().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/public/tenants/${encodeURIComponent(slug)}/press/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
      cache: "no-store",
    });
    const text = await res.text();
    return new Response(text || "null", {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return Response.json(null, { status: 502 });
  }
}
