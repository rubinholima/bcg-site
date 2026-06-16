import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * POST /api/me/change-password — troca obrigatória no primeiro login.
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/me/change-password", { requireAuth: true });
}
