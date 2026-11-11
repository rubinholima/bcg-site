import assert from "node:assert/strict";
import {
  BUILDER_BLOCK_REGISTRY,
  listRegistryBlockTypes,
  getBlockDefinition,
} from "./block-registry";
import { normalizePageBlocks } from "./block-normalize";

const types = listRegistryBlockTypes();
assert.equal(types.length, 44, `registry deve ter 44 tipos, tem ${types.length}`);
assert.equal(BUILDER_BLOCK_REGISTRY.length, 44);

const unique = new Set(types);
assert.equal(unique.size, types.length, "tipos duplicados no registry");

for (const t of types) {
  assert.ok(getBlockDefinition(t), `definição ausente: ${t}`);
}

const legacy = normalizePageBlocks([
  {
    id: "what",
    type: "what",
    sortOrder: 2,
    config: { cardsPt: [{ title: "A", body: "B" }], whatImagePosition: "left", extraLegacy: 1 },
  },
]);
assert.equal(legacy.length, 1);
assert.equal(legacy[0]!.config.extraLegacy, 1);
assert.equal((legacy[0]!.config.cardsPt as unknown[]).length, 1);

console.log("page-builder-core: block-registry.spec OK");
