import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** POST /api/settings/modules/sync — garante módulos do menu no banco. */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/settings/modules/sync", { requireAuth: true });
}
