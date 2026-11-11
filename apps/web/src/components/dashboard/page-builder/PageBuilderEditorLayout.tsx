"use client";

import type { ReactNode } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page, PageTheme } from "@/types/page";
import { PageBuilderChrome, type PageEditorialStatus } from "./PageBuilderChrome";
import { PageBuilderNavigator } from "./PageBuilderNavigator";
import { PageBuilderLivePreview } from "./PageBuilderLivePreview";
import { PageBuilderPreviewViewportBar } from "./PageBuilderPreviewViewportBar";
import type { usePageEditorSession } from "./usePageEditorSession";
import { PageBuilderRevisionPanel } from "./PageBuilderRevisionPanel";

type Session = ReturnType<typeof usePageEditorSession>;

export function PageBuilderEditorLayout({
  chrome,
  session,
  blocks,
  theme,
  previewSlug,
  formId,
  children,
  collapsedBlockIds,
  onToggleCollapse,
  onMove,
  onRemove,
  showRevisions,
  pageId,
  onRevisionRestored,
}: {
  chrome: {
    title: string;
    subtitle?: string;
    backHref?: string;
    previewHref?: string;
    previewLabel?: string;
    subjectLogo?: { src: string; alt: string } | null;
    editorialStatus?: PageEditorialStatus;
    publishedAt?: string | null;
    updatedAt?: string | null;
    showDraft?: boolean;
    showPublish?: boolean;
    externalError?: string | null;
  };
  session: Session;
  blocks: HomeContentBlock[];
  theme: PageTheme;
  previewSlug?: string;
  formId: string;
  children: ReactNode;
  collapsedBlockIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onMove: (from: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  showRevisions?: boolean;
  pageId?: string;
  onRevisionRestored?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 min-h-0">
      <PageBuilderChrome
        title={chrome.title}
        subtitle={chrome.subtitle}
        backHref={chrome.backHref}
        previewHref={chrome.previewHref}
        previewLabel={chrome.previewLabel}
        saving={session.savingMode !== "idle"}
        success={!!session.editorSuccess}
        error={session.editorError ?? chrome.externalError}
        formId={formId}
        subjectLogo={chrome.subjectLogo}
        editorialStatus={chrome.editorialStatus}
        publishedAt={chrome.publishedAt}
        updatedAt={chrome.updatedAt}
        dirty={session.dirty}
        onSaveDraft={chrome.showDraft ? () => void session.saveDraft() : undefined}
        onPublish={chrome.showPublish ? () => void session.savePublish() : undefined}
        onTogglePreview={() => session.setPreviewOpen((o) => !o)}
        previewOpen={session.previewOpen}
        onUndo={session.undo}
        onRedo={session.redo}
        savingMode={session.savingMode}
      />
      {session.previewOpen && previewSlug ? (
        <>
          <PageBuilderPreviewViewportBar viewport={session.previewViewport} onChange={session.setPreviewViewport} />
          <PageBuilderLivePreview
            blocks={blocks}
            theme={theme}
            slug={previewSlug}
            viewport={session.previewViewport}
            selectedBlockId={session.selectedBlockId}
            onSelectBlock={session.setSelectedBlockId}
          />
        </>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <PageBuilderNavigator
            blocks={blocks}
            selectedBlockId={session.selectedBlockId}
            collapsedBlockIds={collapsedBlockIds}
            onSelect={session.setSelectedBlockId}
            onToggleCollapse={onToggleCollapse}
            onMove={onMove}
            onDuplicate={session.duplicateBlockAt}
            onCopy={session.copyBlockAt}
            onRemove={onRemove}
          />
          {showRevisions && chrome.editorialStatus && pageId ? (
            <PageBuilderRevisionPanel pageId={pageId} onRestored={() => onRevisionRestored?.()} />
          ) : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
