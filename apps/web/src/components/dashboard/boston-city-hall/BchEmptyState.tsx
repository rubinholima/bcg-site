"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BchEmptyState({
  icon: Icon,
  message,
  action,
  className,
}: {
  icon?: LucideIcon;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-10 text-center", className)}>
      {Icon ? <Icon className="mb-3 h-9 w-9 text-slate-600" aria-hidden /> : null}
      <p className="max-w-sm text-sm text-slate-400">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
