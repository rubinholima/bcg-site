"use client";

import { useCallback, useRef, useState } from "react";
import type { HomeContentBlock, HomeBlockType } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import type { PageTheme } from "@/types/page";
import { createBlock } from "@/lib/home-content";
import { isBlockHidden, normalizeBlocks, sortBlocks } from "./block-utils";

const HISTORY_LIMIT = 50;

export function usePageBuilder(initialBlocks: HomeContentBlock[] = [], initialTheme: PageTheme = {}) {
  const [blocks, setBlocks] = useState<HomeContentBlock[]>(() => normalizeBlocks(initialBlocks));
  const [theme, setTheme] = useState<PageTheme>(initialTheme);
  const historyPast = useRef<HomeContentBlock[][]>([]);
  const historyFuture = useRef<HomeContentBlock[][]>([]);

  const pushHistory = useCallback((snapshot: HomeContentBlock[]) => {
    historyPast.current = [...historyPast.current.slice(-(HISTORY_LIMIT - 1)), snapshot.map((b) => ({ ...b, config: { ...b.config } }))];
    historyFuture.current = [];
  }, []);

  const setBlocksWithHistory = useCallback(
    (updater: (prev: HomeContentBlock[]) => HomeContentBlock[]) => {
      setBlocks((prev) => {
        pushHistory(prev);
        return updater(prev);
      });
    },
    [pushHistory],
  );
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
    setBlocksWithHistory((prev) => {
      const to = from + direction;
      if (to <= 0 || to >= prev.length - 1) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to]!, next[from]!];
      return normalizeBlocks(next);
    });
  }, [setBlocksWithHistory]);

  const moveBlockTo = useCallback((from: number, to: number) => {
    setBlocksWithHistory((prev) => {
      if (from <= 0 || from >= prev.length - 1) return prev;
      if (to <= 0 || to >= prev.length - 1) return prev;
      if (from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return normalizeBlocks(next);
    });
  }, [setBlocksWithHistory]);

  const removeBlock = useCallback((index: number) => {
    setBlocksWithHistory((prev) => {
      if (index <= 0 || index >= prev.length - 1) return prev;
      return normalizeBlocks(prev.filter((_, i) => i !== index));
    });
  }, [setBlocksWithHistory]);

  const duplicateBlock = useCallback((index: number) => {
    setBlocksWithHistory((prev) => {
      const block = prev[index];
      if (!block) return prev;
      const clone: HomeContentBlock = {
        ...block,
        id: `${block.type}-${Date.now()}`,
        config: { ...block.config },
      };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return normalizeBlocks(next);
    });
  }, [setBlocksWithHistory]);

  const undo = useCallback(() => {
    const past = historyPast.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1]!;
    historyPast.current = past.slice(0, -1);
    setBlocks((current) => {
      historyFuture.current = [...historyFuture.current, current.map((b) => ({ ...b, config: { ...b.config } }))];
      return normalizeBlocks(previous);
    });
  }, []);

  const redo = useCallback(() => {
    const future = historyFuture.current;
    if (future.length === 0) return;
    const next = future[future.length - 1]!;
    historyFuture.current = future.slice(0, -1);
    setBlocks((current) => {
      historyPast.current = [...historyPast.current, current.map((b) => ({ ...b, config: { ...b.config } }))];
      return normalizeBlocks(next);
    });
  }, []);

  const addModule = useCallback((type: HomeBlockType) => {
    if (type === "header" || type === "footer") return;
    setBlocksWithHistory((prev) => {
      const beforeFooter = prev.slice(0, -1);
      const newBlock = createBlock(type, beforeFooter.length);
      return normalizeBlocks([...beforeFooter, newBlock, prev[prev.length - 1]!]);
    });
  }, [setBlocksWithHistory]);

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
    duplicateBlock,
    undo,
    redo,
    addModule,
    isBlockHidden,
    sortBlocks,
    normalizeBlocks,
  };
}

export type PageBuilderState = ReturnType<typeof usePageBuilder>;
