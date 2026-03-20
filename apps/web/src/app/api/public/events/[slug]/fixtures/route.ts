import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/events/:slug/fixtures
 * Jogos do evento (blocos proximos_eventos / ultimos_eventos no content do evento).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return new Response(null, { status: 404 });
  }
  return forwardRequest(_request, `/public/events/${encodeURIComponent(slug)}/fixtures`, {
    cache: "no-store",
  });
}
