import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const encoded = encodeURIComponent(token);
  return forwardRequest(request, `/public/boston-city-hall/orders/${encoded}`, {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "private, no-store",
    },
  });
}
