import { BUILDER_BLOCK_SCHEMA_VERSION } from "./block-registry";

export type NormalizedBlock = {
  id: string;
  type: string;
  sortOrder: number;
  config: Record<string, unknown>;
  schemaVersion?: number;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Normaliza bloco salvo sem descartar campos desconhecidos. */
export function normalizeBlockConfig(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) return {};
  const out: Record<string, unknown> = { ...raw };
  if (out.schemaVersion === undefined) {
    out.schemaVersion = BUILDER_BLOCK_SCHEMA_VERSION;
  }
  return out;
}

export function normalizeBlock(raw: unknown, fallbackSort = 0): NormalizedBlock | null {
  if (!isPlainObject(raw)) return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
  const type = typeof raw.type === "string" && raw.type.trim() ? raw.type.trim() : "";
  if (!id || !type) return null;
  const sortOrder =
    typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
      ? raw.sortOrder
      : fallbackSort;
  return {
    id,
    type,
    sortOrder,
    config: normalizeBlockConfig(raw.config),
    schemaVersion: BUILDER_BLOCK_SCHEMA_VERSION,
  };
}

export function normalizePageBlocks(blocks: unknown): NormalizedBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((b, i) => normalizeBlock(b, i))
    .filter((b): b is NormalizedBlock => b != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
