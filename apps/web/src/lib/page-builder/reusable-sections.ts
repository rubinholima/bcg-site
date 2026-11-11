import type { HomeContentBlock } from "@/types/home-content";
import { normalizeBlocks } from "@/components/dashboard/page-builder/block-utils";

export type StoredReusableSection = {
  id: string;
  name: string;
  blocks: HomeContentBlock[];
  updatedAt: number;
};

const storageKey = (tenantId: string) => `cup360-reusable-sections:${tenantId}`;

export function listReusableSections(tenantId: string): StoredReusableSection[] {
  if (typeof window === "undefined" || !tenantId) return [];
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReusableSection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReusableSection(tenantId: string, name: string, blocks: HomeContentBlock[]): StoredReusableSection {
  const entry: StoredReusableSection = {
    id: `rs-${Date.now()}`,
    name: name.trim() || "Seção",
    blocks: normalizeBlocks(blocks.map((b) => ({ ...b, id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }))),
    updatedAt: Date.now(),
  };
  const list = [...listReusableSections(tenantId), entry];
  localStorage.setItem(storageKey(tenantId), JSON.stringify(list));
  return entry;
}

export function deleteReusableSection(tenantId: string, id: string): void {
  const list = listReusableSections(tenantId).filter((s) => s.id !== id);
  localStorage.setItem(storageKey(tenantId), JSON.stringify(list));
}

export function renameReusableSection(tenantId: string, id: string, name: string): void {
  const list = listReusableSections(tenantId).map((s) => (s.id === id ? { ...s, name: name.trim() || s.name, updatedAt: Date.now() } : s));
  localStorage.setItem(storageKey(tenantId), JSON.stringify(list));
}
