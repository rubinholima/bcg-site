import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * Proxy para GET /me do backend.
 * Lê o token do cookie (httpOnly) e envia Authorization: Bearer ao backend.
 * O browser envia os cookies automaticamente para esta rota (mesma origem).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/me", { requireAuth: true });
}
