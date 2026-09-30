import {
  DASHBOARD_MENU,
  filterAccessibleDashboardMenu,
  hasAccessToMenuItem,
  resolveCanonicalMenuPermission,
  type MenuItemConfig,
} from "@/lib/dashboard-menu.config";

describe("dashboard menu permission", () => {
  it("usa permission canônica independente do pathPrefix", () => {
    const item: MenuItemConfig = {
      slug: "x",
      label: "X",
      moduleSlug: "legacy",
      permission: "medico",
      accessSlug: "saude__medico",
    };
    expect(resolveCanonicalMenuPermission(item)).toBe("medico");
  });

  it("grupos vazios não dependem de posição na árvore", () => {
    const a = resolveCanonicalMenuPermission({
      slug: "a",
      label: "A",
      moduleSlug: "futebol_tryouts",
    });
    const b = resolveCanonicalMenuPermission({
      slug: "b",
      label: "B",
      moduleSlug: "futebol_tryouts",
      accessSlug: "futebol__try_out",
    });
    expect(a).toBe("futebol_tryouts");
    expect(b).toBe("futebol__try_out");
  });

  it("menu principal usa hierarquia legado (sem workspaces ws_)", () => {
    expect(DASHBOARD_MENU.some((i) => i.slug.startsWith("ws_"))).toBe(false);
    expect(DASHBOARD_MENU.some((i) => i.slug === "futebol")).toBe(true);
    expect(DASHBOARD_MENU.some((i) => i.slug === "configuracoes")).toBe(true);
  });

  it("super_admin enxerga Configurações → Pessoas e acessos", () => {
    const config = DASHBOARD_MENU.find((i) => i.slug === "configuracoes");
    const pessoas = config?.children?.find((c) => c.slug === "config_pessoas_acessos");
    expect(pessoas?.href).toBe("/dashboard/configuracoes/pessoas-acessos");
    expect(
      hasAccessToMenuItem(
        pessoas!,
        "configuracoes",
        () => false,
        true,
        true,
        "super_admin",
        [],
      ),
    ).toBe(true);
  });

  it("super_admin mantém grupos operacionais no filtro de menu", () => {
    const visible = filterAccessibleDashboardMenu(
      DASHBOARD_MENU,
      () => false,
      true,
      true,
      "super_admin",
      [],
    );
    expect(visible.some((i) => i.slug === "futebol")).toBe(true);
    expect(visible.some((i) => i.slug === "saude")).toBe(true);
  });

  it("usuário normal sem módulo não vê futebol", () => {
    const visible = filterAccessibleDashboardMenu(
      DASHBOARD_MENU,
      () => false,
      true,
      false,
      "editor",
      ["dashboard"],
    );
    expect(visible.some((i) => i.slug === "futebol")).toBe(false);
  });
});
