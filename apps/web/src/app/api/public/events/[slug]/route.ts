import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/events/:slug
 * Evento publicado — mesmo payload que GET /public/events/:slug no Nest.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return new Response(null, { status: 404 });
  }
  return forwardRequest(request, `/public/events/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
}
