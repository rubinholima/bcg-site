import { describe, expect, it } from "vitest";
import { alignmentClass, resolveBlockAlignments } from "./theme-resolve";
import type { HomeContentBlock } from "@/types/home-content";

describe("theme-resolve", () => {
  it("resolve alignment with block overrides", () => {
    const block = {
      id: "x",
      type: "text",
      sortOrder: 1,
      config: { titleAlign: "center", bodyAlign: "right" },
    } as HomeContentBlock;
    const aligned = resolveBlockAlignments(block, { titleAlign: "left" });
    expect(aligned.title).toBe("center");
    expect(aligned.body).toBe("right");
    expect(alignmentClass(aligned.body)).toContain("right");
  });
});
