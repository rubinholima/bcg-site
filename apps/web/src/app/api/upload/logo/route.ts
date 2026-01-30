import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * POST /api/upload/logo - upload de logo (group ou tenant) - proxy com Bearer do cookie.
 * Body: multipart/form-data com "file" (imagem) e "scope" ("group" ou tenantId).
 */
export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.arrayBuffer();
  const res = await fetch(`${apiUrl}/upload/logo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
  });
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
