/**
 * URLs de navegação pública do portfólio — domínio customizado (pathBase "") vs plataforma (/portfolio/[slug]).
 */

/** Home do site público do tenant (logo). */
export function portfolioPublicHomeHref(pathBase: string, slug: string): string {
  if (pathBase === "") return "/";
  if (pathBase.startsWith("/portfolio/")) return pathBase;
  const b = pathBase.replace(/\/$/, "");
  return `${b}/${encodeURIComponent(slug)}`;
}

/**
 * Link do seletor PT/EN: preserva pathname visível e query, troca só `lang`.
 * `pt` remove `lang` (padrão).
 */
export function buildPortfolioLangSwitchHref(
  pathname: string,
  search: string | URLSearchParams | Readonly<URLSearchParams> | null | undefined,
  targetLang: "pt" | "en",
): string {
  const path = pathname && pathname.startsWith("/") ? pathname : "/";
  const params = new URLSearchParams(
    typeof search === "string" ? search.replace(/^\?/, "") : search?.toString() ?? "",
  );
  if (targetLang === "en") {
    params.set("lang", "en");
  } else {
    params.delete("lang");
  }
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

/** Evita `pathBase || "/portfolio"` — "" é válido (domínio customizado). */
export function portfolioHeaderBasePath(pathBase: string | undefined): string {
  if (pathBase === undefined) return "/portfolio";
  return pathBase;
}
