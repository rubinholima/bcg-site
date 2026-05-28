import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return new Response(null, { status: 404 });
  return forwardRequest(_request, `/public/tenants/${encodeURIComponent(slug)}/press/photos`, { cache: "no-store" });
}
