"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  title: string;
  children: React.ReactNode;
}

/** Botão ? no cabeçalho da página — ajuda contextual (não usar textos de help no corpo). */
export function DashboardPageHelpButton({ title, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Ajuda desta página"
        title="Ajuda"
      >
        <CircleHelp className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
