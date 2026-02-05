import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const accessToken = request.cookies.get("access_token")?.value;
  const idToken = request.cookies.get("id_token")?.value;
  return accessToken ?? idToken ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { uid } = await params;
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenantSlug");
  if (!tenantSlug?.trim()) {
    return NextResponse.json({ error: "tenantSlug é obrigatório" }, { status: 400 });
  }
  const res = await fetch(
    `${apiUrl}/api/workmail/inbox/${encodeURIComponent(uid)}?tenantSlug=${encodeURIComponent(tenantSlug.trim())}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
