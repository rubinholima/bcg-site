import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/settings/modules - lista todos os módulos com permissões (apenas super_admin).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/settings/modules", { requireAuth: true });
}

/**
 * PATCH /api/settings/modules - atualiza permissões dos módulos (apenas super_admin).
 * Body: { permissions: { [slug]: { company_admin: boolean, editor: boolean } } }
 */
export async function PATCH(request: NextRequest) {
  return forwardRequest(request, "/settings/modules", { requireAuth: true });
}
