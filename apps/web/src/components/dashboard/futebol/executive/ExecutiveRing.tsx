"use client";

import { cn } from "@/lib/utils";

export function ExecutiveRing({
  value,
  total,
  size = 44,
  stroke = 4,
  className,
  trackClassName = "text-zinc-800",
  fillClassName = "text-emerald-500",
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
}) {
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0 -rotate-90", className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className={trackClassName}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className={fillClassName}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
