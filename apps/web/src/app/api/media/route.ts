import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * GET /api/media?sizeKey=hero - lista imagens da pasta de mídia (proxy para API).
 * GET /api/media?all=1 - lista tudo (logos + media) a partir das primeiras pastas do bucket.
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const sizeKey = searchParams.get("sizeKey") ?? undefined;
  const all = searchParams.get("all") ?? undefined;
  const params = new URLSearchParams();
  if (all) params.set("all", all);
  if (sizeKey) params.set("sizeKey", sizeKey);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${apiUrl}/media${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
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

/**
 * POST /api/media - upload de imagem para mídia (proxy para API).
 * Body: multipart/form-data com "file" (imagem) e "sizeKey" (opcional: hero, card, etc.).
 */
export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.arrayBuffer();
  const res = await fetch(`${apiUrl}/media`, {
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

/**
 * DELETE /api/media?key=media/hero/xxx.jpg — remove imagem ou logo do S3.
 */
export async function DELETE(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key?.trim()) {
    return NextResponse.json({ error: "Query 'key' é obrigatória" }, { status: 400 });
  }
  const res = await fetch(`${apiUrl}/media?key=${encodeURIComponent(key.trim())}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
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

/**
 * PATCH /api/media — atualiza o nome exibido de um item.
 * Body: JSON { key: string, displayName: string | null }
 */
export async function PATCH(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { key?: string; displayName?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }
  const res = await fetch(`${apiUrl}/media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key: body.key, displayName: body.displayName ?? null }),
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
