"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page, PageContent, PageTheme } from "@/types/page";
import { normalizeBlocks, sanitizeBlocksForSave } from "./block-utils";
import { authFetch } from "@/lib/authFetch";

export type PreviewViewport = "desktop" | "tablet" | "mobile";

export type PageEditorSessionOptions = {
  page: Page | null;
  setPage: React.Dispatch<React.SetStateAction<Page | null>>;
  storageKey: string;
  blocks: HomeContentBlock[];
  /** Substitui persistência padrão de Page (group-home, evento). */
  onSaveDraft?: () => Promise<void>;
  onSavePublish?: () => Promise<void>;
};

export function usePageEditorSession({ page, setPage, storageKey, blocks, onSaveDraft, onSavePublish }: PageEditorSessionOptions) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [savingMode, setSavingMode] = useState<"idle" | "draft" | "publish">("idle");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSuccess, setEditorSuccess] = useState<string | null>(null);
  const clipboardRef = useRef<HomeContentBlock | null>(null);
  const historyPast = useRef<HomeContentBlock[][]>([]);
  const historyFuture = useRef<HomeContentBlock[][]>([]);
  const savedFingerprint = useRef<string>("");
  const [dirty, setDirty] = useState(false);

  const fingerprint = useCallback(() => {
    return JSON.stringify({ theme: page?.content?.theme ?? {}, blocks });
  }, [page?.content?.theme, blocks]);

  useEffect(() => {
    setDirty(fingerprint() !== savedFingerprint.current && savedFingerprint.current !== "");
  }, [fingerprint]);

  useEffect(() => {
    if (!page?.id) return;
    savedFingerprint.current = fingerprint();
  }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { at: number; content: PageContent };
      if (Date.now() - parsed.at > 1000 * 60 * 60 * 72) {
        localStorage.removeItem(storageKey);
        return;
      }
      if (savedFingerprint.current && fingerprint() !== savedFingerprint.current) return;
      // sessão local só quando ainda não há diff do servidor
    } catch {
      /* ignore */
    }
  }, [storageKey, fingerprint]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined" || !page) return;
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ at: Date.now(), content: { theme: page.content.theme, blocks } }),
        );
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [storageKey, page, blocks, dirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const pushHistory = useCallback(() => {
    historyPast.current = [...historyPast.current.slice(-49), blocks.map((b) => ({ ...b, config: { ...b.config } }))];
    historyFuture.current = [];
  }, [blocks]);

  const duplicateBlockAt = useCallback(
    (index: number) => {
      pushHistory();
      const block = blocks[index];
      if (!block) return;
      const clone: HomeContentBlock = { ...block, id: `${block.type}-${Date.now()}`, config: { ...block.config } };
      const next = [...blocks];
      next.splice(index + 1, 0, clone);
      setPage((prev) =>
        prev ? { ...prev, content: { ...prev.content, blocks: normalizeBlocks(next) } } : prev,
      );
      setSelectedBlockId(clone.id);
    },
    [blocks, pushHistory, setPage],
  );

  const copyBlockAt = useCallback(
    (index: number) => {
      const block = blocks[index];
      if (!block) return;
      clipboardRef.current = { ...block, config: { ...block.config } };
      setEditorSuccess("Bloco copiado.");
    },
    [blocks],
  );

  const pasteBlockAfter = useCallback(
    (index: number) => {
      const src = clipboardRef.current;
      if (!src) return;
      pushHistory();
      const clone: HomeContentBlock = { ...src, id: `${src.type}-${Date.now()}`, config: { ...src.config } };
      const next = [...blocks];
      next.splice(index + 1, 0, clone);
      setPage((prev) =>
        prev ? { ...prev, content: { ...prev.content, blocks: normalizeBlocks(next) } } : prev,
      );
      setSelectedBlockId(clone.id);
    },
    [blocks, pushHistory, setPage],
  );

  const undo = useCallback(() => {
    const past = historyPast.current;
    if (!past.length) return;
    const prev = past[past.length - 1]!;
    historyPast.current = past.slice(0, -1);
    historyFuture.current = [...historyFuture.current, blocks.map((b) => ({ ...b, config: { ...b.config } }))];
    setPage((p) => (p ? { ...p, content: { ...p.content, blocks: normalizeBlocks(prev) } } : p));
  }, [blocks, setPage]);

  const redo = useCallback(() => {
    const future = historyFuture.current;
    if (!future.length) return;
    const next = future[future.length - 1]!;
    historyFuture.current = future.slice(0, -1);
    historyPast.current = [...historyPast.current, blocks.map((b) => ({ ...b, config: { ...b.config } }))];
    setPage((p) => (p ? { ...p, content: { ...p.content, blocks: normalizeBlocks(next) } } : p));
  }, [blocks, setPage]);

  const saveContent = useCallback(
    async (action: "save_draft" | "publish") => {
      setSavingMode(action === "save_draft" ? "draft" : "publish");
      setEditorError(null);
      setEditorSuccess(null);
      try {
        if (action === "save_draft" && onSaveDraft) {
          await onSaveDraft();
          savedFingerprint.current = fingerprint();
          setDirty(false);
          if (storageKey) localStorage.removeItem(storageKey);
          setEditorSuccess("Rascunho salvo.");
          return;
        }
        if (action === "publish" && onSavePublish) {
          await onSavePublish();
          savedFingerprint.current = fingerprint();
          setDirty(false);
          if (storageKey) localStorage.removeItem(storageKey);
          setEditorSuccess("Salvo.");
          return;
        }
        if (!page?.id) return;
        const payloadBlocks = sanitizeBlocksForSave(blocks);
        const res = await authFetch(`/api/pages/${page.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { theme: page.content.theme, blocks: payloadBlocks },
            editorialAction: action,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { message?: string; error?: string }).message ?? (data as { error?: string }).error ?? "Erro ao salvar");
        }
        const updated = (await res.json()) as Page;
        setPage(updated);
        savedFingerprint.current = JSON.stringify({ theme: updated.content?.theme ?? {}, blocks: normalizeBlocks(updated.content?.blocks ?? []) });
        setDirty(false);
        if (storageKey) localStorage.removeItem(storageKey);
        setEditorSuccess(action === "save_draft" ? "Rascunho salvo." : "Publicado.");
      } catch (e) {
        setEditorError(e instanceof Error ? e.message : "Erro ao salvar");
      } finally {
        setSavingMode("idle");
      }
    },
    [page, blocks, setPage, storageKey, fingerprint, onSaveDraft, onSavePublish],
  );

  const loadDraftIntoEditor = useCallback(() => {
    if (!page?.draftContent?.blocks?.length) return;
    pushHistory();
    setPage((p) =>
      p
        ? {
            ...p,
            content: {
              theme: page.draftContent?.theme ?? p.content.theme,
              blocks: normalizeBlocks(page.draftContent?.blocks ?? []),
            },
          }
        : p,
    );
    setEditorSuccess("Rascunho carregado no editor.");
  }, [page, pushHistory, setPage]);

  return {
    selectedBlockId,
    setSelectedBlockId,
    previewOpen,
    setPreviewOpen,
    previewViewport,
    setPreviewViewport,
    savingMode,
    editorError,
    editorSuccess,
    dirty,
    duplicateBlockAt,
    copyBlockAt,
    pasteBlockAfter,
    undo,
    redo,
    saveDraft: () => saveContent("save_draft"),
    savePublish: () => saveContent("publish"),
    loadDraftIntoEditor,
    pushHistory,
  };
}
