"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BchLoadingBlock({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-amber-400/80" aria-hidden />
      {label ? <p className="text-xs text-slate-500">{label}</p> : null}
    </div>
  );
}
