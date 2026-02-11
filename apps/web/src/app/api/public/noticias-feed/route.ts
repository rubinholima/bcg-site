import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import type { NoticiasItem } from "@/types/home-content";

export const dynamic = "force-dynamic";

const CACHE_TTL_SEC = 5 * 60; // 5 min (permite ver atualizações mais rápido)
const cache = new Map<string, { data: NoticiasItem[]; expires: number }>();

function isValidRssUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !["localhost", "127.0.0.1"].includes(u.hostname);
  } catch {
    return false;
  }
}

/** Extrai URL de imagem de string HTML (img, og:image, url em texto) */
function extractImgFromHtml(html: string): string | undefined {
  if (!html || typeof html !== "string") return undefined;
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img) return img[1];
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) return og[1];
  // fallback: URL com extensão de imagem ou CDN conhecido
  const extMatch = html.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)(\?[^\s"']*)?/i);
  if (extMatch) return extMatch[0];
  const cdnMatch = html.match(/https?:\/\/[^\s"']*(?:cdninstagram|fbcdn|googleusercontent|cloudfront)[^\s"']*/i);
  if (cdnMatch) return cdnMatch[0];
  return undefined;
}

/** Extrai URL de objeto media (xml2js) */
function getUrlFromMedia(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string" && v.startsWith("http")) return v;
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const attrs = (obj.$ ?? obj) as Record<string, string>;
    const url = attrs?.url ?? attrs?.href ?? attrs?.src;
    if (url) return url;
  }
  if (Array.isArray(v) && v[0]) return getUrlFromMedia(v[0]);
  return undefined;
}

/** Extrai URL de imagem do item RSS */
function extractImageUrl(item: Parser.Item & Record<string, unknown>): string | undefined {
  // 1. Enclosure
  const enclosure = item.enclosure;
  if (enclosure?.url) {
    const type = (enclosure as { type?: string }).type;
    const isImage = !type || type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(enclosure.url);
    if (isImage) return enclosure.url;
  }

  // 2. media:content, media:thumbnail (Media RSS, RSS.app)
  const m1 = getUrlFromMedia(item.mediaContent ?? item["media:content"]);
  if (m1) return m1;
  const m2 = getUrlFromMedia(item.mediaThumbnail ?? item["media:thumbnail"]);
  if (m2) return m2;

  // 3. content:encoded, content, description, summary — qualquer HTML com img
  const htmlFields = [
    item.contentEncoded ?? item["content:encoded"],
    item.content,
    item.description,
    item.summary,
  ];
  for (const h of htmlFields) {
    let html: string | undefined;
    if (typeof h === "string") html = h;
    else if (Array.isArray(h) && h[0]) html = typeof h[0] === "string" ? h[0] : (h[0] as Record<string, unknown>)?._ as string;
    else if (h && typeof h === "object") html = (h as Record<string, unknown>)._ as string;
    const url = extractImgFromHtml(html ?? "");
    if (url) return url;
  }

  // 4. itunes:image
  const itunes = item.itunes as { image?: string } | undefined;
  if (itunes?.image) return itunes.image;

  return undefined;
}

/** Usa proxy para imagens externas (evita CORS/referrer block) */
function toProxyImageUrl(url: string): string {
  return `/api/public/noticias-image?url=${encodeURIComponent(url)}`;
}

/**
 * GET /api/public/noticias-feed?rssUrl=...&max=10
 * Busca e parseia um feed RSS, retorna itens de notícia.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rssUrl = searchParams.get("rssUrl")?.trim();
  const max = Math.min(20, Math.max(1, parseInt(searchParams.get("max") ?? "10", 10) || 10));

  if (!rssUrl) {
    return NextResponse.json({ error: "rssUrl é obrigatório" }, { status: 400 });
  }

  if (!isValidRssUrl(rssUrl)) {
    return NextResponse.json({ error: "URL inválida. Use apenas HTTPS." }, { status: 400 });
  }

  const nocache = searchParams.get("nocache") === "1";
  const cacheKey = `${rssUrl}:${max}:v2`; // v2 = imagens via proxy
  const cached = !nocache && cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  try {
    const parser = new Parser({
      timeout: 10000,
      customFields: {
        item: [
          ["media:content", "mediaContent"],
          ["media:thumbnail", "mediaThumbnail"],
          ["content:encoded", "contentEncoded"],
        ],
      },
    });
    const feed = await parser.parseURL(rssUrl);
    const items: NoticiasItem[] = (feed.items ?? [])
      .filter((i) => i.title?.trim() && i.link?.trim())
      .slice(0, max)
      .map((item, idx) => ({
        id: item.guid || item.link || `item-${idx}`,
        title: item.title?.trim() ?? "",
        link: item.link?.trim() ?? "",
        excerpt: item.contentSnippet?.trim()?.slice(0, 200) || item.content?.toString().replace(/<[^>]+>/g, "").slice(0, 200),
        dateISO: item.isoDate || item.pubDate,
        imageUrl: (() => {
          const u = extractImageUrl(item);
          return u ? toProxyImageUrl(u) : undefined;
        })(),
        source: feed.title?.trim(),
      }));

    cache.set(cacheKey, { data: items, expires: Date.now() + CACHE_TTL_SEC * 1000 });

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar feed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
