import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * GET /api/workmail/orgs - lista empresas (proxy com Bearer do cookie).
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${apiUrl}/api/workmail/orgs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = json.message ?? text;
      return NextResponse.json({ error: msg }, { status: res.status });
    } catch {
      return NextResponse.json(
        { error: text || "Erro ao carregar empresas" },
        { status: res.status },
      );
    }
  }
  const data = await res.json();
  return NextResponse.json(data);
}
