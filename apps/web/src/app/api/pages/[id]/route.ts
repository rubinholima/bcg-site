import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardRequest(request, `/pages/${encodeURIComponent(id)}`, { requireAuth: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardRequest(request, `/pages/${encodeURIComponent(id)}`, { requireAuth: true });
}
