import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const encoded = encodeURIComponent(slug);
  return forwardRequest(request, `/public/boston-city-hall/events/${encoded}`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
