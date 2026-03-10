import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/settings/integrations/omie/status — status da integração Omie (base integração).
 * Requer autenticação. Retorna { configured, ok?, message? }.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/settings/integrations/omie/status", { requireAuth: true });
}
