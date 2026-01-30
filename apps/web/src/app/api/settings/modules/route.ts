import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * GET /api/settings/modules - lista todos os módulos com permissões (apenas super_admin).
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${apiUrl}/settings/modules`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.status === 401 ? "Unauthorized" : await res.text() },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}

/**
 * PATCH /api/settings/modules - atualiza permissões dos módulos (apenas super_admin).
 * Body: { permissions: { [slug]: { company_admin: boolean, editor: boolean } } }
 */
export async function PATCH(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${apiUrl}/settings/modules`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.status === 401 ? "Unauthorized" : await res.text() },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
