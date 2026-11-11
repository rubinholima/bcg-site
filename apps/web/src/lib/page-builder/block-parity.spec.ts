import { describe, expect, it } from "vitest";
import { BUILDER_BLOCK_REGISTRY } from "@bcg/page-builder-core";
import { blockHasRendererCoverage, validateRegistryParity } from "./block-parity";

describe("block-parity", () => {
  it("covers all 44 canonical types", () => {
    expect(BUILDER_BLOCK_REGISTRY.length).toBe(44);
    for (const def of BUILDER_BLOCK_REGISTRY) {
      expect(blockHasRendererCoverage(def.type)).toBe(true);
    }
  });

  it("createBlock + renderer for tenant context", () => {
    const result = validateRegistryParity("tenant_page");
    expect(result.ok).toBe(true);
    if (!result.ok) expect(result.errors).toEqual([]);
  });
});
