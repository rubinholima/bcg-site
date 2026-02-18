import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** Sempre buscar dados frescos do backend (cores do header, etc.). */
export const dynamic = "force-dynamic";

/**
 * GET /api/public/group-home
 * Retorna a página da Home do Grupo (BCG). Público, sem autenticação.
 * Usado pela rota "/" para renderizar o builder.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/public/group-home", {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
