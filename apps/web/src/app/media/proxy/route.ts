import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "bcg-platform-assets.s3.us-east-1.amazonaws.com",
  "bcg-platform-assets.s3.amazonaws.com",
  "images.unsplash.com",
];

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "169.254.169.254", "[::1]"];

function isHostAllowed(host: string): boolean {
  const lower = host.toLowerCase();
  if (BLOCKED_HOSTS.some((b) => lower === b || lower.endsWith("." + b)))
    return false;
  return ALLOWED_HOSTS.some((a) => lower === a || lower.endsWith("." + a));
}

/**
 * Decode URL param; support single and double encoding.
 */
function decodeUrlParam(raw: string): string {
  let u = decodeURIComponent(raw);
  try {
    if (/%[0-9A-Fa-f]{2}/.test(u)) u = decodeURIComponent(u);
  } catch {
    // keep u as is
  }
  return u;
}

/**
 * GET /media/proxy?url=...
 * Proxy para imagens (S3, Unsplash, etc.). Rota no Next (fora de /api) para
 * que Nginx envie ao Next. Erros retornam JSON com motivo.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw || typeof raw !== "string") {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  let u: string;
  try {
    u = decodeUrlParam(raw.trim());
  } catch {
    return NextResponse.json(
      { error: "invalid_url", value: raw.substring(0, 200) },
      { status: 400 }
    );
  }

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return NextResponse.json(
      { error: "invalid_url", value: u.substring(0, 200) },
      { status: 400 }
    );
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json(
      { error: "invalid_protocol" },
      { status: 400 }
    );
  }

  if (!isHostAllowed(target.hostname)) {
    return NextResponse.json(
      { error: "url_not_allowed", host: target.hostname },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "bcg-media-proxy" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream_failed", status: res.status },
        { status: res.status }
      );
    }

    const contentType =
      res.headers.get("content-type") || "application/octet-stream";
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "proxy_failed" },
      { status: 502 }
    );
  }
}
