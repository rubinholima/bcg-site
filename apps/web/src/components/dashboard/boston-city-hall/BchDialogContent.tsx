"use client";

import { cn } from "@/lib/utils";
import { DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import {
  BCH_DIALOG_BODY,
  BCH_DIALOG_FOOTER,
  BCH_DIALOG_HEADER,
  BCH_DIALOG_SHELL,
  type BchDialogSize,
} from "@/components/dashboard/boston-city-hall/bch-ui-classes";

export function BchDialogContent({
  size = "md",
  className,
  header,
  footer,
  children,
}: {
  size?: BchDialogSize;
  className?: string;
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const sizeClass = {
    sm: "max-w-[min(100vw-2rem,28rem)]",
    md: "max-w-[min(100vw-2rem,36rem)]",
    lg: "max-w-[min(100vw-2rem,56rem)]",
    xl: "max-w-[min(100vw-2rem,56rem)]",
  }[size];

  return (
    <DialogContent className={cn(BCH_DIALOG_SHELL, sizeClass, className)}>
      <DialogHeader className={BCH_DIALOG_HEADER}>{header}</DialogHeader>
      <div className={BCH_DIALOG_BODY}>{children}</div>
      {footer ? <DialogFooter className={BCH_DIALOG_FOOTER}>{footer}</DialogFooter> : null}
    </DialogContent>
  );
}
