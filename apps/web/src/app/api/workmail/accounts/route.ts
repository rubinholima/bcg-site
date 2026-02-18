import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/workmail/accounts?workmailOrganizationId= - lista contas WorkMail da organização AWS.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/accounts", { requireAuth: true });
}

/**
 * POST /api/workmail/accounts - cria conta WorkMail.
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/accounts", { requireAuth: true });
}

/**
 * DELETE /api/workmail/accounts - remove conta WorkMail (body: { workmailOrganizationId, workmailUserId }).
 */
export async function DELETE(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/accounts", { requireAuth: true });
}
