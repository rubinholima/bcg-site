import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardRequest(request, `/me/announcements/${id}/dismiss`, { requireAuth: true });
}
