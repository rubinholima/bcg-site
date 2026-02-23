import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/orgs", { requireAuth: true });
}
