"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BchEmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon?: LucideIcon;
  message: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
      {Icon ? <Icon className="mb-2 h-8 w-8 text-slate-600" aria-hidden /> : null}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
