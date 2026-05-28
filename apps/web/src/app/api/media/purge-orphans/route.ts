import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** POST /api/media/purge-orphans?dryRun=1 */
export async function POST(request: NextRequest) {
  const qs = request.nextUrl.search;
  return forwardRequest(request, `/media/purge-orphans${qs}`, { requireAuth: true });
}
