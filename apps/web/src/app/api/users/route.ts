import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/users - lista usuários (proxy com Bearer do cookie).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/users", { requireAuth: true });
}

/**
 * POST /api/users - cria usuário (proxy com Bearer do cookie).
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/users", { requireAuth: true });
}
