"use client";

import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type FeedbackVariant = "success" | "warning" | "error" | "info";

const variantConfig: Record<
  FeedbackVariant,
  { icon: typeof CheckCircle2; iconClass: string; titleClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    titleClass: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    titleClass: "text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-destructive",
    titleClass: "text-destructive",
  },
  info: {
    icon: Info,
    iconClass: "text-primary",
    titleClass: "text-foreground",
  },
};

export interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: FeedbackVariant;
}

export function FeedbackModal({
  open,
  onOpenChange,
  title,
  message,
  variant = "info",
}: FeedbackModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant === "success" ? "bg-emerald-500/20" : variant === "warning" ? "bg-amber-500/20" : variant === "error" ? "bg-destructive/20" : "bg-primary/20"}`}
            >
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
            </div>
            <div className="flex-1 space-y-1.5 pt-0.5">
              <DialogTitle className={config.titleClass}>{title}</DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {message}
              </p>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
