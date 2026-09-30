import {
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
});
