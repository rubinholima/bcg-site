import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * POST /api/workmail/accounts/disable - desabilita email (DeregisterFromWorkMail), não deleta usuário.
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/accounts/disable", { requireAuth: true });
}
