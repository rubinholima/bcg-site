import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * POST /api/workmail/accounts/reset-password - redefine senha.
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/accounts/reset-password", { requireAuth: true });
}
