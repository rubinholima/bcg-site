import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const encoded = encodeURIComponent(slug);
  return forwardRequest(request, `/public/boston-city-hall/events/${encoded}/orders`, {
    cache: "no-store",
  });
}
