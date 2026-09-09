import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardRequest(request, `/master/announcements/${id}`, { requireAuth: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardRequest(request, `/master/announcements/${id}`, { requireAuth: true });
}
