import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.toString();
  return forwardRequest(request, `/master/live-users${q ? `?${q}` : ""}`, { requireAuth: true });
}
