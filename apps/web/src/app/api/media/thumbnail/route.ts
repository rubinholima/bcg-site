import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl, getToken } from "@/lib/apiProxy";

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
      buildBackendUrl(`/media/thumbnail?key=${encodeURIComponent(key.trim())}`),
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
