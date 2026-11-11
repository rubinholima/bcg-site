import type { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; revisionId: string }> }) {
  const { id, revisionId } = await context.params;
  return forwardRequest(request, `/pages/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}/restore`, {
    requireAuth: true,
  });
}
