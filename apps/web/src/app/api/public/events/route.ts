import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/events?tenantId=...
 * Lista eventos publicados. Sem tenantId: eventos do grupo. Com tenantId: eventos daquele clube.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/public/events", {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
