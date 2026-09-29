"use client";

import { cn } from "@/lib/utils";
import { CAPTACAO_MOBILE_RATING_SCALE } from "@/lib/captacao-mobile-flow";

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
};

export function CaptacaoRatingPicker({ label, value, onChange, className }: Props) {
  const { min, max } = CAPTACAO_MOBILE_RATING_SCALE;
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={cn("space-y-2 rounded-lg border border-border/40 bg-muted/5 p-3 md:p-4", className)}>
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {options.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex min-h-[44px] items-center justify-center rounded-lg border text-base font-semibold transition-colors md:min-h-10 md:text-sm",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 text-foreground hover:bg-muted/60",
              )}
              aria-pressed={active}
              aria-label={`${label}: ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
