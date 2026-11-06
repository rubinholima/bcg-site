/**
 * Links públicos do portfólio: mesma árvore de rotas em /portfolio/[slug]/* ou na raiz do domínio customizado (rewrite).
 */

const DEFAULT_SITE_ORIGIN = "https://www.bostoncitygroup.biz";

function siteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (u && /^https?:\/\//i.test(u)) {
    return u.replace(/\/$/, "");
  }
  return DEFAULT_SITE_ORIGIN;
}

/** URL absoluta do site principal para página de outro tenant (carrossel de logos no domínio customizado). */
export function externalPortfolioUrlForTenantSlug(tenantSlug: string): string {
  return `${siteOrigin()}/portfolio/${encodeURIComponent(tenantSlug)}`;
}

/**
 * Reescreve href que aponta para /portfolio/[tenantSlug]/... conforme o contexto (domínio customizado vs grupo).
 */
export function rewriteTenantPortfolioHref(
  href: string,
  tenantSlug: string,
  basePath: string,
): string {
  const h = (href ?? "").trim();
  if (!h.startsWith("/")) return h;
  const enc = encodeURIComponent(tenantSlug);
  const prefix = `/portfolio/${enc}`;
  if (!h.startsWith(prefix)) return h;
  const rest = h.slice(prefix.length);
  const pathRest = rest === "" ? "/" : rest.startsWith("/") ? rest : `/${rest}`;
  if (basePath === "") {
    return pathRest;
  }
  const b = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return `${b}${pathRest === "/" ? "" : pathRest}`;
}
