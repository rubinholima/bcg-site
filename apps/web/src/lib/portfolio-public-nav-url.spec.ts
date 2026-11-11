import {
  buildPortfolioLangSwitchHref,
  portfolioHeaderBasePath,
  portfolioPublicHomeHref,
} from "./portfolio-public-nav-url";
import { rewriteTenantPortfolioHref } from "./portfolio-public-links";

const SLUG = "boston-city-fc-usa";

describe("portfolio-public-nav-url — PROMPT 033", () => {
  describe("NATIVE_PUBLIC_DOMAIN (pathBase vazio)", () => {
    const base = "";

    it("root PT → EN", () => {
      expect(buildPortfolioLangSwitchHref("/", "", "en")).toBe("/?lang=en");
    });

    it("root EN → PT", () => {
      expect(buildPortfolioLangSwitchHref("/", "lang=en", "pt")).toBe("/");
    });

    it("nested public path PT → EN", () => {
      expect(buildPortfolioLangSwitchHref("/news/example", "", "en")).toBe("/news/example?lang=en");
    });

    it("preserva query além de lang", () => {
      expect(buildPortfolioLangSwitchHref("/imprensa", "foo=1&lang=pt", "en")).toBe("/imprensa?foo=1&lang=en");
    });

    it("home sem vazamento de /portfolio", () => {
      expect(portfolioPublicHomeHref(base, SLUG)).toBe("/");
    });

    it("rewrite de href interno do CMS", () => {
      const internal = `/portfolio/${SLUG}/events`;
      expect(rewriteTenantPortfolioHref(internal, SLUG, base)).toBe("/events");
    });
  });

  describe("LEGACY_CUSTOM (mesma regra de pathBase vazio)", () => {
    const base = "";
    const villa = "villa-nova-saf";

    it("root PT → EN", () => {
      expect(buildPortfolioLangSwitchHref("/", "", "en")).toBe("/?lang=en");
    });

    it("nested", () => {
      expect(buildPortfolioLangSwitchHref("/imprensa", "", "en")).toBe("/imprensa?lang=en");
    });

    it("sem leak portfolio", () => {
      expect(
        buildPortfolioLangSwitchHref(
          "/",
          "",
          "en",
        ),
      ).not.toContain("/portfolio/");
      expect(portfolioPublicHomeHref(base, villa)).toBe("/");
    });
  });

  describe("PLATFORM portfolio", () => {
    const pathBase = `/portfolio/${SLUG}`;

    it("PT → EN na home do portfolio", () => {
      expect(buildPortfolioLangSwitchHref(pathBase, "", "en")).toBe(`${pathBase}?lang=en`);
    });

    it("EN → PT", () => {
      expect(buildPortfolioLangSwitchHref(pathBase, "lang=en", "pt")).toBe(pathBase);
    });

    it("nested", () => {
      expect(buildPortfolioLangSwitchHref(`${pathBase}/news`, "", "en")).toBe(
        `${pathBase}/news?lang=en`,
      );
    });

    it("home href", () => {
      expect(portfolioPublicHomeHref(pathBase, SLUG)).toBe(pathBase);
    });
  });

  describe("portfolioHeaderBasePath", () => {
    it("preserva string vazia (custom domain)", () => {
      expect(portfolioHeaderBasePath("")).toBe("");
    });

    it("default só quando undefined", () => {
      expect(portfolioHeaderBasePath(undefined)).toBe("/portfolio");
    });
  });
});
