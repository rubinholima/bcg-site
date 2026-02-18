import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * PATCH /api/users/[username]/role - altera role do usuário (proxy com Bearer do cookie).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return forwardRequest(request, `/users/${encodeURIComponent(username)}/role`, { requireAuth: true });
}
