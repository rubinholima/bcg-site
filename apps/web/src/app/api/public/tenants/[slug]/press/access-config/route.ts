import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug?.trim()) return Response.json({ requiresCode: false });
  return forwardRequest(_request, `/public/tenants/${encodeURIComponent(slug)}/press/access-config`, {
    cache: "no-store",
  });
}
