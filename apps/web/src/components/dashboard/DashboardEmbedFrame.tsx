"use client";

import { ExternalLink } from "lucide-react";

interface DashboardEmbedFrameProps {
  src: string;
  title: string;
}

/** Incorpora app externo no painel (iframe). Requer frame-ancestors no site de origem. */
export function DashboardEmbedFrame({ src, title }: DashboardEmbedFrameProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-end gap-2 sm:mb-3">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
        >
          Abrir em nova aba
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background">
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
        />
      </div>
    </div>
  );
}
