"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BchInlineError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left",
        className,
      )}
      role="alert"
    >
      <p className="text-sm text-red-200">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="min-h-[44px] shrink-0" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
