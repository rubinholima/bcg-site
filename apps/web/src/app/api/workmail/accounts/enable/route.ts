import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * POST /api/workmail/accounts/enable - habilita email (RegisterToWorkMail).
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/accounts/enable", { requireAuth: true });
}
