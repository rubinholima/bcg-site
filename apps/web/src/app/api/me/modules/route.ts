import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * GET /api/me/modules - lista de slugs de módulos que o usuário pode acessar (para o menu).
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${apiUrl}/me/modules`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.status === 401 ? "Unauthorized" : "Error" },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
