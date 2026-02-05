import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * GET /api/media/thumbnail?key=media/hero/xxx.jpg
 * Proxy para a API Nest que busca a imagem no S3 com credenciais AWS.
 * A miniatura carrega mesmo com bucket privado.
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return new NextResponse(null, { status: 401 });
  }
  const key = request.nextUrl.searchParams.get("key");
  if (!key?.trim()) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${apiUrl}/media/thumbnail?key=${encodeURIComponent(key.trim())}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
