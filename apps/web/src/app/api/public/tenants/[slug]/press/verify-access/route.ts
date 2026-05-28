import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { buildBackendUrl } from "@/lib/apiProxy";
import { pressAccessCookieName, pressAccessCookiePath } from "@/lib/press-access-cookie";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return Response.json({ ok: false, message: "Slug inválido" }, { status: 400 });

  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = (body.code ?? "").trim();
  } catch {
    return Response.json({ ok: false, message: "Corpo inválido" }, { status: 400 });
  }
  if (!code) return Response.json({ ok: false, message: "Informe o código" }, { status: 400 });

  const apiRes = await fetch(buildBackendUrl(`/public/tenants/${encodeURIComponent(slug)}/press/verify-access`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  const text = await apiRes.text();
  let data: { sessionToken?: string; expiresAt?: string; message?: string } = {};
  try {
    data = text.trim() ? (JSON.parse(text) as typeof data) : {};
  } catch {
    /* ignore */
  }

  if (!apiRes.ok) {
    const nestMsg = (data as { message?: string | string[] }).message;
    const msg =
      (typeof nestMsg === "string" ? nestMsg : Array.isArray(nestMsg) ? nestMsg[0] : undefined) ||
      data.message ||
      (apiRes.status === 401 ? "Código inválido ou expirado." : "Não foi possível validar o código.");
    return Response.json({ ok: false, message: msg }, { status: apiRes.status });
  }

  if (!data.sessionToken) {
    return Response.json({ ok: false, message: "Resposta inválida do servidor." }, { status: 500 });
  }

  const expMs = data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 12 * 60 * 60 * 1000;
  const maxAge = Math.max(60, Math.floor((expMs - Date.now()) / 1000));
  const cookieStore = await cookies();
  cookieStore.set(pressAccessCookieName(slug), data.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: pressAccessCookiePath(slug),
    maxAge,
  });

  return Response.json({ ok: true, expiresAt: data.expiresAt ?? null });
}
