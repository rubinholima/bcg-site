import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/group
 * Dados do grupo (nome, logo) — público, sem auth.
 * Usado por layouts quando o backend pode não estar disponível (dev local).
 */
export async function GET(request: NextRequest) {
  try {
    const res = await forwardRequest(request, "/group", {
      requireAuth: false,
      cache: "no-store",
    });
    if (res.status === 200) return res;
    return fallbackResponse();
  } catch {
    return fallbackResponse();
  }
}

function fallbackResponse() {
  return Response.json({
    id: "",
    name: "Boston City Group",
    slug: "bcg",
    logoUrl: null,
    description: null,
    address: null,
    contactName: null,
    contactPhone: null,
    homeContent: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
