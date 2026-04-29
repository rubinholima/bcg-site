import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** GET — histórico de alterações na matriz de permissões (super admin). */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/settings/modules/audit", { requireAuth: true });
}
