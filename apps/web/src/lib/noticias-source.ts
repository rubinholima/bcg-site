export type NoticiaSourceKind = "social" | "site";

export interface NoticiaSourceResolved {
  /** Rótulo principal (card / modal) */
  display: string;
  kind: NoticiaSourceKind;
  /** Instagram, Facebook, YouTube… */
  platform?: string;
  /** @usuario ou nome do autor */
  author?: string;
  /** Nome do veículo/site */
  siteName?: string;
  /** Host legível (otempo.com) */
  siteHost?: string;
}

const SITE_LABELS: Record<string, string> = {
  "globoesporte.globo.com": "Globo Esporte",
  "ge.globo.com": "Globo Esporte",
  "g1.globo.com": "G1",
  "uol.com.br": "UOL",
  "olhardigital.com.br": "Olhar Digital",
  "lance.com.br": "Lance!",
  "terra.com.br": "Terra",
  "otempo.com.br": "O Tempo",
  "em.com.br": "Estado de Minas",
  "itatiaia.com.br": "Itatiaia",
  "superesportes.com.br": "Superesportes",
  "gazetaesportiva.com": "Gazeta Esportiva",
  "meiahora.com.br": "Meia Hora",
};

const SOCIAL_PLATFORMS: Array<{ test: RegExp; label: string }> = [
  { test: /instagram\.com|cdninstagram|fbcdn\.net.*instagram/i, label: "Instagram" },
  { test: /facebook\.com|fb\.com|fbcdn\.net/i, label: "Facebook" },
  { test: /twitter\.com|^x\.com/i, label: "X (Twitter)" },
  { test: /tiktok\.com/i, label: "TikTok" },
  { test: /youtube\.com|youtu\.be/i, label: "YouTube" },
  { test: /threads\.net/i, label: "Threads" },
  { test: /linkedin\.com/i, label: "LinkedIn" },
];

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function hostToSiteName(host: string): string {
  const h = normalizeHost(host);
  if (SITE_LABELS[h]) return SITE_LABELS[h];
  const parts = h.split(".");
  const base = parts[0] ?? h;
  if (base.length <= 3) return h;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function detectSocialPlatform(url: string): string | undefined {
  for (const { test, label } of SOCIAL_PLATFORMS) {
    if (test.test(url)) return label;
  }
  return undefined;
}

function isGoogleNewsRedirect(url: string): boolean {
  return /news\.google\.com/i.test(url);
}

function isRssAggregatorHost(host: string): boolean {
  return /rss\.app|rssfeed|feedburner|feedly/i.test(host);
}

/** Títulos agregados (Google News) costumam terminar com " - Fonte". */
export function sourceFromNewsTitle(title: string | undefined): string | undefined {
  const t = title?.trim() ?? "";
  const dash = t.lastIndexOf(" - ");
  if (dash > 24 && dash < t.length - 2) {
    return t.slice(dash + 3).trim();
  }
  return undefined;
}

function normalizeAuthor(raw: string | undefined): string | undefined {
  const a = raw?.trim();
  if (!a) return undefined;
  if (a.startsWith("@")) return a;
  if (/^[a-z0-9._]+$/i.test(a) && !a.includes(" ")) return `@${a}`;
  return a;
}

function instagramUsernameFromLink(link: string): string | undefined {
  try {
    const u = new URL(link);
    if (!/instagram\.com/i.test(u.hostname)) return undefined;
    const parts = u.pathname.split("/").filter(Boolean);
    const first = parts[0];
    if (!first || ["p", "reel", "reels", "tv", "stories", "explore"].includes(first.toLowerCase())) {
      return undefined;
    }
    return normalizeAuthor(first);
  } catch {
    return undefined;
  }
}

function authorFromFeedTitle(feedTitle: string | undefined): string | undefined {
  const t = feedTitle?.trim() ?? "";
  const m = t.match(/(?:instagram|facebook|youtube|tiktok)[:\s]+(@?\S+)/i);
  if (m?.[1]) return normalizeAuthor(m[1]);
  const at = t.match(/(@[a-z0-9._]+)/i);
  if (at?.[1]) return at[1];
  return undefined;
}

function buildDisplay(res: Omit<NoticiaSourceResolved, "display">): string {
  if (res.kind === "social") {
    const platform = res.platform ?? "Rede social";
    if (res.author) return `${platform} · ${res.author}`;
    return platform;
  }
  if (res.siteName && res.siteHost && res.siteName.toLowerCase() !== res.siteHost.toLowerCase()) {
    return `${res.siteName} · ${res.siteHost}`;
  }
  if (res.siteName) return res.siteName;
  if (res.siteHost) return res.siteHost;
  if (res.author) return res.author;
  return "Fonte desconhecida";
}

export function resolveNoticiaSource(input: {
  link?: string;
  title?: string;
  creator?: string;
  author?: string;
  feedTitle?: string;
}): NoticiaSourceResolved {
  const link = input.link?.trim() ?? "";
  const creator = normalizeAuthor(input.creator?.trim());
  const authorField = normalizeAuthor(input.author?.trim());
  const fromTitle = sourceFromNewsTitle(input.title?.trim());
  const feedTitle = input.feedTitle?.trim();

  let platform: string | undefined;
  let siteHost: string | undefined;
  let siteName: string | undefined;
  let author = creator || authorField;
  let kind: NoticiaSourceKind = "site";

  if (link) {
    platform = detectSocialPlatform(link);
    if (platform) {
      kind = "social";
      author = author || instagramUsernameFromLink(link) || authorFromFeedTitle(feedTitle);
    } else if (!isGoogleNewsRedirect(link)) {
      try {
        siteHost = normalizeHost(new URL(link).hostname);
        if (!isRssAggregatorHost(siteHost)) {
          siteName = hostToSiteName(siteHost);
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (fromTitle) {
    siteName = fromTitle;
    kind = "site";
  }

  if (!platform && feedTitle && !isRssAggregatorHost(feedTitle)) {
    const feedPlatform = detectSocialPlatform(feedTitle);
    if (feedPlatform) {
      kind = "social";
      platform = feedPlatform;
      author = author || authorFromFeedTitle(feedTitle);
    } else if (!siteName && !fromTitle) {
      const lower = feedTitle.toLowerCase();
      const isGeneric = /rss|feed|notícias|news/i.test(lower) && lower.length < 30;
      if (!isGeneric) siteName = feedTitle;
    }
  }

  if (kind === "site" && author && siteName) {
    const partial: Omit<NoticiaSourceResolved, "display"> = {
      kind,
      siteName,
      siteHost,
      author,
    };
    return {
      ...partial,
      display: `${siteName} · ${author}`,
    };
  }

  const partial: Omit<NoticiaSourceResolved, "display"> = {
    kind,
    platform,
    author: kind === "social" ? author : author && !siteName ? author : undefined,
    siteName,
    siteHost,
  };

  return {
    ...partial,
    display: buildDisplay(partial),
  };
}

/** @deprecated use resolveNoticiaSource */
export function sourceFromNewsLink(link: string | undefined): string | undefined {
  if (!link?.trim()) return undefined;
  return resolveNoticiaSource({ link }).display;
}

/** @deprecated use resolveNoticiaSource */
export function hostnameToSourceLabel(hostname: string): string {
  return hostToSiteName(hostname);
}

export function noticiaSourceKindLabel(kind: NoticiaSourceKind, lang: "pt" | "en"): string {
  if (kind === "social") return lang === "pt" ? "Rede social" : "Social network";
  return lang === "pt" ? "Site / portal" : "Website";
}
