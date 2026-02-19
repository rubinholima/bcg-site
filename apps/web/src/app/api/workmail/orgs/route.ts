import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/workmail/orgs - lista empresas (proxy com Bearer do cookie).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/orgs", { requireAuth: true });
}
