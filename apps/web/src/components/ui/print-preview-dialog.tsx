"use client";

import { useCallback, useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  html: string | null;
  onPrint?: () => void;
  loadingLabel?: string;
}

/** Pré-visualização de HTML para impressão/PDF — iframe srcDoc dentro de Dialog (nunca window.open). */
export function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  html,
  onPrint,
  loadingLabel = "Carregando pré-visualização…",
}: PrintPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fitIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const contentH = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
      );
      const minH = Math.round(window.innerHeight * 0.68);
      iframe.style.height = `${Math.max(contentH + 24, minH)}px`;
    } catch {
      iframe.style.height = "68vh";
    }
  }, []);

  useEffect(() => {
    if (!open || !html) return;
    const t = window.setTimeout(fitIframe, 80);
    return () => window.clearTimeout(t);
  }, [open, html, fitIframe]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(92vh,980px)] w-[min(960px,calc(100vw-1.5rem))] max-h-[min(92vh,980px)] flex-col overflow-hidden"
        contentClassName="flex h-full min-h-0 max-h-full flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-200 p-3 dark:bg-zinc-900">
          {html ? (
            <iframe
              ref={iframeRef}
              title={title}
              srcDoc={html}
              onLoad={fitIframe}
              className="mx-auto block w-full max-w-[820px] rounded-md border border-border bg-white shadow-sm"
              style={{ minHeight: "68vh", height: "68vh" }}
              sandbox="allow-same-origin"
            />
          ) : (
            <p className="flex min-h-[40vh] items-center justify-center p-6 text-center text-muted-foreground">
              {loadingLabel}
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t border-border px-4 py-3 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onPrint ? (
            <Button
              type="button"
              className="bg-[#00205B] text-white hover:bg-[#003087]"
              onClick={onPrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir / PDF
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
