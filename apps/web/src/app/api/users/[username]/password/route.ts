import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/** PATCH /api/users/[username]/password — redefine senha (super admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return forwardRequest(request, `/users/${encodeURIComponent(username)}/password`, {
    requireAuth: true,
  });
}
