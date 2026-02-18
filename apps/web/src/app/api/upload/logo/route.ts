import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * POST /api/upload/logo - upload de logo (group ou tenant) - proxy com Bearer do cookie.
 * Body: multipart/form-data com "file" (imagem) e "scope" ("group" ou tenantId).
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/upload/logo", {
    requireAuth: true,
    skipContentType: true, // Preserva o Content-Type original (multipart/form-data)
  });
}
