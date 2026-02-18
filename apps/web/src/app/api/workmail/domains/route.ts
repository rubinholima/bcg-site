import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/workmail/domains?workmailOrganizationId= - domínios custom extraídos dos emails existentes (ListUsers).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/domains", { requireAuth: true });
}
