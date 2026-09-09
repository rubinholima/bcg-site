import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function POST(request: NextRequest) {
  return forwardRequest(request, "/presence/heartbeat", { requireAuth: true });
}
