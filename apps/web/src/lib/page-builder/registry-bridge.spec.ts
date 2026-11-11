import { describe, expect, it } from "vitest";
import { buildModuleOptionsFromRegistry } from "./registry-bridge";
import { BUILDER_BLOCK_REGISTRY } from "@bcg/page-builder-core";

describe("registry-bridge", () => {
  it("exports module options for all canonical registry types", () => {
    const opts = buildModuleOptionsFromRegistry();
    const types = new Set(opts.map((o) => o.type));
    for (const entry of BUILDER_BLOCK_REGISTRY) {
      expect(types.has(entry.type)).toBe(true);
    }
  });
});
