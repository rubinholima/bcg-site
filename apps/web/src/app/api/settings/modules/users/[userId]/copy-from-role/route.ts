import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  return forwardRequest(request, `/settings/modules/users/${encodeURIComponent(userId)}/copy-from-role`, {
    requireAuth: true,
  });
}
