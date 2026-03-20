import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/media?sizeKey=hero - lista imagens da pasta de mídia (proxy para API).
 * GET /api/media?all=1 - lista tudo (logos + media) a partir das primeiras pastas do bucket.
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/media", { requireAuth: true });
}

/**
 * POST /api/media - upload de imagem para mídia (proxy para API).
 * Body: multipart/form-data com "file" (imagem) e "sizeKey" (opcional: hero, card, etc.).
 */
export async function POST(request: NextRequest) {
  return forwardRequest(request, "/media", {
    requireAuth: true,
    skipContentType: true, // Preserva o Content-Type original (multipart/form-data)
  });
}

/**
 * DELETE /api/media?key=media/hero/xxx.jpg — remove imagem ou logo do S3.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key?.trim()) {
    return NextResponse.json({ error: "Query 'key' é obrigatória" }, { status: 400 });
  }
  /** Path sem query: forwardRequest já repassa ?key= da requisição. Duplicar ?key na URL quebrava o DELETE no S3 (objeto não era apagado e “voltava” na lista). */
  return forwardRequest(request, "/media", { requireAuth: true });
}

/**
 * PATCH /api/media — atualiza o nome exibido de um item.
 * Body: JSON { key: string, displayName: string | null }
 */
export async function PATCH(request: NextRequest) {
  return forwardRequest(request, "/media", { requireAuth: true });
}
