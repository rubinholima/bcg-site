import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/events/:slug/upload-url
 * Retorna { uploadUrl } se houver token ativo para o evento (para botão na página).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return new Response(null, { status: 404 });
  }
  return forwardRequest(_request, `/public/events/${encodeURIComponent(slug)}/upload-url`, {
    cache: "no-store",
  });
}
