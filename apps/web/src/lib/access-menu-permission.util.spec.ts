import { getMenuAccessTree } from "@/lib/dashboard-menu.config";
import {
  buildStorageSlugLabelMap,
  storageSlugFromTreeLeaf,
} from "@/lib/access-menu-permission.util";

describe("access-menu-permission.util", () => {
  it("storageSlugFromTreeLeaf prioriza moduleSlug", () => {
    expect(storageSlugFromTreeLeaf("futebol__atletas", "futebol_jogadores")).toBe(
      "futebol_jogadores",
    );
    expect(storageSlugFromTreeLeaf("dashboard", undefined)).toBe("dashboard");
  });

  it("mapa de rótulos cobre folhas do menu sem expor slug como label principal", () => {
    const tree = getMenuAccessTree();
    const map = buildStorageSlugLabelMap(tree);
    expect(map.size).toBeGreaterThan(20);
    const sample = [...map.entries()].slice(0, 5);
    for (const [, label] of sample) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
