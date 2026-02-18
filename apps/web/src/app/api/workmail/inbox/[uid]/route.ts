import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenantSlug");
  if (!tenantSlug?.trim()) {
    return NextResponse.json({ error: "tenantSlug é obrigatório" }, { status: 400 });
  }
  return forwardRequest(
    request,
    `/api/workmail/inbox/${encodeURIComponent(uid)}?tenantSlug=${encodeURIComponent(tenantSlug.trim())}`,
    { requireAuth: true }
  );
}
