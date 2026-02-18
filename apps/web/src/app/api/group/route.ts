import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/group - dados do grupo (BCG) - proxy com Bearer do cookie.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/group", { requireAuth: true });
}

/**
 * PATCH /api/group - atualiza grupo (nome, descrição, logoUrl) - proxy com Bearer do cookie.
 */
export async function PATCH(request: NextRequest) {
  return forwardRequest(request, "/group", { requireAuth: true });
}
