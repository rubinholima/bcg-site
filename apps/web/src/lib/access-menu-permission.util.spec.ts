import { getMenuAccessCatalog } from "@/lib/dashboard-menu.config";
import {
  buildAuthorizationSlugLabelMap,
  humanLabelForAuthorizationSlug,
  looksLikeAuthorizationSlug,
  storageSlugFromTreeLeaf,
  UNRESOLVED_PERMISSION_LABEL,
} from "@/lib/access-menu-permission.util";

describe("access-menu-permission.util", () => {
  const labelMap = buildAuthorizationSlugLabelMap();

  it("storageSlugFromTreeLeaf prioriza moduleSlug (valor persistido inalterado)", () => {
    expect(storageSlugFromTreeLeaf("futebol__atletas", "futebol_jogadores")).toBe(
      "futebol_jogadores",
    );
    expect(storageSlugFromTreeLeaf("dashboard", undefined)).toBe("dashboard");
  });

  it("mapeia slugs canônicos do menu para rótulos humanos", () => {
    const comissao = humanLabelForAuthorizationSlug("futebol__futebol_comissao", labelMap);
    expect(comissao).toMatch(/Comissão/i);
    expect(comissao).not.toBe("futebol__futebol_comissao");
    expect(looksLikeAuthorizationSlug(comissao)).toBe(false);

    const captacao = humanLabelForAuthorizationSlug("futebol__futebol_captacao", labelMap);
    expect(captacao).toBe("Captação");

    const agenda = humanLabelForAuthorizationSlug("agenda__agenda", labelMap);
    expect(agenda).toMatch(/Agenda/i);
    expect(agenda).not.toBe("agenda__agenda");
  });

  it("permite granular com barra usando alias do catálogo", () => {
    const catalog = getMenuAccessCatalog();
    const granular = catalog.find((e) => e.slug.includes("/") && e.slug.includes("__"));
    if (!granular) return;
    const label = humanLabelForAuthorizationSlug(granular.slug, labelMap);
    expect(label).toBe(granular.name);
    expect(looksLikeAuthorizationSlug(label)).toBe(false);
  });

  it("nunca usa slug bruto como rótulo principal", () => {
    for (const entry of getMenuAccessCatalog().slice(0, 80)) {
      const label = humanLabelForAuthorizationSlug(entry.slug, labelMap);
      expect(label).not.toBe(entry.slug);
      expect(looksLikeAuthorizationSlug(label)).toBe(false);
    }
  });

  it("slug desconhecido vira rótulo neutro, não identificador técnico", () => {
    const unknown = humanLabelForAuthorizationSlug("zzz__totally_unknown_slug", labelMap);
    expect(unknown).toBe(UNRESOLVED_PERMISSION_LABEL);
    expect(looksLikeAuthorizationSlug(unknown)).toBe(false);
  });

  it("catálogo cobre entradas conhecidas do menu", () => {
    expect(labelMap.size).toBeGreaterThan(50);
    expect(labelMap.has("futebol__futebol_comissao")).toBe(true);
    expect(labelMap.has("agenda__agenda")).toBe(true);
  });
});
