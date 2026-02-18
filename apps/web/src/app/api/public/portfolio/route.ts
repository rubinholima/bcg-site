import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/portfolio
 * Retorna todos os tenants públicos (clubes e empresas) para o portfólio.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/public/portfolio", {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
