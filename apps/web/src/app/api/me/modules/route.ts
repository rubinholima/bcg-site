import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/me/modules - lista de slugs de módulos que o usuário pode acessar (para o menu).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/me/modules", { requireAuth: true });
}
