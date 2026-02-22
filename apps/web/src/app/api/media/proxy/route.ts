import { NextRequest, NextResponse } from "next/server";
import { getPublicImageUrl } from "@/lib/media-url";

/**
 * GET /api/media/proxy?url=...
 * Redireciona (302) para a URL canônica no domínio principal (www.bostoncitygroup.biz).
 * Mantido para links antigos; o front não usa mais este endpoint.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (url == null || url === "") {
    return NextResponse.redirect("https://www.bostoncitygroup.biz", 302);
  }
  const canonical = getPublicImageUrl(url);
  if (!canonical) {
    return NextResponse.redirect("https://www.bostoncitygroup.biz", 302);
  }
  const res = NextResponse.redirect(canonical, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
