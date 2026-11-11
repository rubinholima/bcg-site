import { describe, expect, it } from "vitest";
import type { HomeContentBlock } from "@/types/home-content";
import { resolveEffectiveBlockConfig, responsiveVisibilityClasses } from "./resolve-block-style";

describe("resolve-block-style", () => {
  it("cascata desktop → tablet → mobile", () => {
    const block: HomeContentBlock = {
      id: "t1",
      type: "text",
      sortOrder: 1,
      config: {
        titleAlign: "left",
        styleResponsive: {
          tablet: { titleAlign: "center" },
          mobile: { titleAlign: "right" },
        },
      },
    };
    expect(resolveEffectiveBlockConfig(block, "desktop").titleAlign).toBe("left");
    expect(resolveEffectiveBlockConfig(block, "tablet").titleAlign).toBe("center");
    expect(resolveEffectiveBlockConfig(block, "mobile").titleAlign).toBe("right");
  });

  it("gera classes de visibilidade responsiva", () => {
    const block: HomeContentBlock = {
      id: "t2",
      type: "text",
      sortOrder: 1,
      config: { styleResponsive: { mobile: { visible: false } } },
    };
    expect(responsiveVisibilityClasses(block)).toContain("max-md:hidden");
  });
});
