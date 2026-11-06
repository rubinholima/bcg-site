import { headers } from "next/headers";

export type PortfolioPublicServerContext = {
  /** "" no domínio customizado; "/portfolio/[slug]" no site principal. */
  pathBase: string;
  customDomain: boolean;
  pathname: string;
  forwardedHost: string;
};

/** Base para links relativos do portfólio no servidor (domínio customizado → ""). */
export async function getPortfolioPublicPathBaseServer(slug: string): Promise<string> {
  const ctx = await getPortfolioPublicContextServer(slug);
  return ctx.pathBase;
}

export async function getPortfolioPublicContextServer(slug: string): Promise<PortfolioPublicServerContext> {
  const h = await headers();
  const customDomain = h.get("x-cup360-custom-domain") === "1";
  const pathname = h.get("x-cup360-pathname") || "/";
  const forwardedHost =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.trim() || "";
  const enc = encodeURIComponent(slug);
  const pathBase = customDomain ? "" : `/portfolio/${enc}`;
  return { pathBase, customDomain, pathname, forwardedHost };
}
