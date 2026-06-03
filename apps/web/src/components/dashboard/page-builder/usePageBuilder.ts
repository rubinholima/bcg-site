"use client";

import { useCallback, useState } from "react";
import type { HomeContentBlock, HomeBlockType } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import type { PageTheme } from "@/types/page";
import { createBlock } from "@/lib/home-content";
import { isBlockHidden, normalizeBlocks, sortBlocks } from "./block-utils";

export function usePageBuilder(initialBlocks: HomeContentBlock[] = [], initialTheme: PageTheme = {}) {
  const [blocks, setBlocks] = useState<HomeContentBlock[]>(() => normalizeBlocks(initialBlocks));
  const [theme, setTheme] = useState<PageTheme>(initialTheme);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());
  const [overlayOpacityDraft, setOverlayOpacityDraft] = useState<string | null>(null);
  const [globalAppearanceOpen, setGlobalAppearanceOpen] = useState(false);

  const resetFromServer = useCallback((nextBlocks: HomeContentBlock[], nextTheme?: PageTheme) => {
    setBlocks(normalizeBlocks(nextBlocks));
    if (nextTheme) setTheme(nextTheme);
  }, []);

  const updateTheme = useCallback((key: keyof PageTheme, value: PageTheme[keyof PageTheme]) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateBlockConfig = useCallback((index: number, key: string, value: unknown) => {
    setBlocks((prev) => {
      const next = [...prev];
      const block = next[index];
      if (!block) return prev;
      next[index] = {
        ...block,
        config: { ...block.config, [key]: value === undefined ? undefined : value },
      };
      return next;
    });
  }, []);

  const updateBlockConfigValue = useCallback((index: number, key: string, value: BlockConfigValue) => {
    setBlocks((prev) => {
      const next = [...prev];
      const block = next[index];
      if (!block) return prev;
      next[index] = {
        ...block,
        config: { ...block.config, [key]: value },
      };
      return next;
    });
  }, []);

  const toggleBlockCollapsed = useCallback((blockId: string) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  const expandAllBlocks = useCallback(() => setCollapsedBlockIds(new Set()), []);
  const collapseAllBlocks = useCallback(() => {
    setCollapsedBlockIds(new Set(blocks.map((b) => b.id)));
  }, [blocks]);

  const moveBlock = useCallback((from: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const to = from + direction;
      if (to <= 0 || to >= prev.length - 1) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to]!, next[from]!];
      return normalizeBlocks(next);
    });
  }, []);

  const moveBlockTo = useCallback((from: number, to: number) => {
    setBlocks((prev) => {
      if (from <= 0 || from >= prev.length - 1) return prev;
      if (to <= 0 || to >= prev.length - 1) return prev;
      if (from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return normalizeBlocks(next);
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((prev) => {
      if (index <= 0 || index >= prev.length - 1) return prev;
      return normalizeBlocks(prev.filter((_, i) => i !== index));
    });
  }, []);

  const addModule = useCallback((type: HomeBlockType) => {
    if (type === "header" || type === "footer") return;
    setBlocks((prev) => {
      const beforeFooter = prev.slice(0, -1);
      const newBlock = createBlock(type, beforeFooter.length);
      return normalizeBlocks([...beforeFooter, newBlock, prev[prev.length - 1]!]);
    });
  }, []);

  return {
    blocks,
    setBlocks,
    theme,
    setTheme,
    collapsedBlockIds,
    overlayOpacityDraft,
    setOverlayOpacityDraft,
    globalAppearanceOpen,
    setGlobalAppearanceOpen,
    resetFromServer,
    updateTheme,
    updateBlockConfig,
    updateBlockConfigValue,
    toggleBlockCollapsed,
    expandAllBlocks,
    collapseAllBlocks,
    moveBlock,
    moveBlockTo,
    removeBlock,
    addModule,
    isBlockHidden,
    sortBlocks,
    normalizeBlocks,
  };
}

export type PageBuilderState = ReturnType<typeof usePageBuilder>;
