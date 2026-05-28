import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { buildBackendUrl } from "@/lib/apiProxy";
import { pressAccessCookieName } from "@/lib/press-access-cookie";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return Response.json({ ok: false, requiresCode: false });

  const configRes = await fetch(buildBackendUrl(`/public/tenants/${encodeURIComponent(slug)}/press/access-config`), {
    cache: "no-store",
  });
  let requiresCode = true;
  try {
    const cfg = configRes.ok ? await configRes.json() : { requiresCode: true };
    requiresCode = cfg.requiresCode !== false;
  } catch {
    requiresCode = true;
  }

  if (!requiresCode) return Response.json({ ok: true, requiresCode: false });

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(pressAccessCookieName(slug))?.value ?? "";
  if (!sessionToken) return Response.json({ ok: false, requiresCode: true });

  const checkRes = await fetch(buildBackendUrl(`/public/tenants/${encodeURIComponent(slug)}/press/check-access`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
    cache: "no-store",
  });
  let ok = false;
  try {
    const data = checkRes.ok ? await checkRes.json() : { ok: false };
    ok = data.ok === true;
  } catch {
    ok = false;
  }

  return Response.json({ ok, requiresCode: true });
}
