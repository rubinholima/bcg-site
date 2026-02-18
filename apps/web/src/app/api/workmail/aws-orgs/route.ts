import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/workmail/aws-orgs - lista organizações WorkMail da AWS (proxy com Bearer do cookie).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/aws-orgs", { requireAuth: true });
}
