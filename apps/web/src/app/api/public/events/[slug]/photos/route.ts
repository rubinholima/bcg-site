import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/events/:slug/photos
 * Fotos do evento para o módulo galeria na página pública.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return new Response(null, { status: 404 });
  }
  return forwardRequest(_request, `/public/events/${encodeURIComponent(slug)}/photos`, {
    cache: "no-store",
  });
}
