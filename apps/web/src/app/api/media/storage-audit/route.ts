import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** GET /api/media/storage-audit */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/media/storage-audit", { requireAuth: true });
}
