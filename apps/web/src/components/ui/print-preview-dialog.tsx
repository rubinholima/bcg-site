"use client";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(960px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[60vh] flex-1 overflow-auto bg-zinc-100 p-3 dark:bg-zinc-900">
          {html ? (
            <iframe
              title={title}
              srcDoc={html}
              className="mx-auto block w-full max-w-[820px] rounded-md border border-border bg-white shadow-sm"
              sandbox="allow-same-origin"
            />
          ) : (
            <p className="p-6 text-center text-muted-foreground">{loadingLabel}</p>
          )}
        </div>
        <DialogFooter className="border-t border-border px-4 py-3 sm:justify-between">
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
