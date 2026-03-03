import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/settings/integrations - lista configs de integração (apenas super_admin).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/settings/integrations", { requireAuth: true });
}

/**
 * PATCH /api/settings/integrations - atualiza configs (apenas super_admin).
 */
export async function PATCH(request: NextRequest) {
  return forwardRequest(request, "/settings/integrations", { requireAuth: true });
}
