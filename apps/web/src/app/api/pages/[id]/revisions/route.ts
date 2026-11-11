import type { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forwardRequest(request, `/pages/${encodeURIComponent(id)}/revisions`, { requireAuth: true });
}
