import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * GET /api/users/[username] - obtém um usuário (proxy com Bearer do cookie).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username } = await params;
  const res = await fetch(
    `${apiUrl}/users/${encodeURIComponent(username)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: res.status === 401 ? "Unauthorized" : await res.text().catch(() => "Error") },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

/**
 * PATCH /api/users/[username] - atualiza usuário (nome, email, role).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username } = await params;
  const body = await request.json();
  const res = await fetch(
    `${apiUrl}/users/${encodeURIComponent(username)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: res.status === 401 ? "Unauthorized" : text || "Error" },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

/**
 * DELETE /api/users/[username] - remove usuário do Cognito.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username } = await params;
  const res = await fetch(
    `${apiUrl}/users/${encodeURIComponent(username)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: res.status === 401 ? "Unauthorized" : text || "Error" },
      { status: res.status },
    );
  }
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data);
}
