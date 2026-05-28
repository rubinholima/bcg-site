import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return Response.json({ ok: false, message: "Slug inválido" }, { status: 400 });
  return forwardRequest(request, `/public/tenants/${encodeURIComponent(slug)}/press/credential-request`, {
    cache: "no-store",
  });
}
