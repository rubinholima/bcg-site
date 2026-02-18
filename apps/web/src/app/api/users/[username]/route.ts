import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/users/[username] - obtém um usuário (proxy com Bearer do cookie).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return forwardRequest(request, `/users/${encodeURIComponent(username)}`, { requireAuth: true });
}

/**
 * PATCH /api/users/[username] - atualiza usuário (nome, email, role).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return forwardRequest(request, `/users/${encodeURIComponent(username)}`, { requireAuth: true });
}

/**
 * DELETE /api/users/[username] - remove usuário do Cognito.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return forwardRequest(request, `/users/${encodeURIComponent(username)}`, { requireAuth: true });
}
