import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; ref: string }> },
) {
  const { token, ref } = await context.params;
  const path = `/public/boston-city-hall/orders/${encodeURIComponent(token)}/tickets/${encodeURIComponent(ref)}/qr`;
  return forwardRequest(request, path, {
    cache: "no-store",
    responseHeaders: { "Cache-Control": "private, no-store" },
  });
}
