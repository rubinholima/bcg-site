"use client";

import { ExternalLink } from "lucide-react";
import { useDashboardShell } from "@/context/DashboardShellContext";

interface DashboardEmbedFrameProps {
  src: string;
  title: string;
}

/** Incorpora app externo no painel (iframe). Requer frame-ancestors no site de origem. */
export function DashboardEmbedFrame({ src, title }: DashboardEmbedFrameProps) {
  const { closeSidebar } = useDashboardShell();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1 flex shrink-0 items-center justify-end gap-2 sm:mb-2">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:text-xs"
        >
          Abrir em nova aba
          <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
        </a>
      </div>
      <div className="relative min-h-[calc(100dvh/var(--app-zoom)-7.5rem)] min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-background sm:min-h-[calc(100dvh/var(--app-zoom)-8.5rem)] sm:rounded-lg">
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          onLoad={closeSidebar}
        />
      </div>
    </div>
  );
}
