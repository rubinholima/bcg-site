import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  return forwardRequest(request, `/pages/tenant/${encodeURIComponent(tenantId)}`, { requireAuth: true });
}
