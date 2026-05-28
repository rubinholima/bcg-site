import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** POST /api/media/consolidate-duplicates?dryRun=1 */
export async function POST(request: NextRequest) {
  const qs = request.nextUrl.search;
  return forwardRequest(request, `/media/consolidate-duplicates${qs}`, { requireAuth: true });
}
