import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** PATCH /api/users/[username]/block — bloqueia/desbloqueia usuário (super admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return forwardRequest(request, `/users/${encodeURIComponent(username)}/block`, {
    requireAuth: true,
  });
}
