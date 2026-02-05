import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function safeSnippet(s: string, max = 300) {
  const t = (s ?? "").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function getToken(request: NextRequest): string | null {
  const accessToken = request.cookies.get("access_token")?.value;
  const idToken = request.cookies.get("id_token")?.value;
  return accessToken ?? idToken ?? null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${apiUrl}/pages/group-home`, {
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  const trimmed = (text ?? "").trim();

  // Backend error -> forward message
  if (!res.ok) {
    if (!trimmed) {
      return NextResponse.json(
        { error: `Backend returned ${res.status} with empty body` },
        { status: res.status }
      );
    }
    try {
      const j = JSON.parse(trimmed);
      const msg = j.message ?? j.error ?? safeSnippet(trimmed);
      return NextResponse.json({ error: msg }, { status: res.status });
    } catch {
      return NextResponse.json({ error: safeSnippet(trimmed) }, { status: res.status });
    }
  }

  // OK but empty body -> not configured
  if (!trimmed) {
    return NextResponse.json(
      { error: "Group home not configured" },
      { status: 404 }
    );
  }

  // OK but invalid JSON -> 502
  try {
    const data = JSON.parse(trimmed);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON from backend", raw: safeSnippet(trimmed) },
      { status: 502 }
    );
  }
}
