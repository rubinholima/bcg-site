import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return forwardRequest(request, `/api/vault/items/${id}/reveal`, { requireAuth: true });
}
