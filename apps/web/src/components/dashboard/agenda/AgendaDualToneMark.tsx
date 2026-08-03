"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SquadCategoryColor } from "@/lib/agenda-squad-category-colors";

type EventSwatch = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

/** Faixa esquerda: elenco + tipo (duas cores). */
export function AgendaDualToneBars({
  squad,
  event,
  className,
}: {
  squad?: SquadCategoryColor | null;
  event?: EventSwatch | null;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 self-stretch overflow-hidden rounded-full", className)} aria-hidden>
      {squad ? (
        <span className="w-2 self-stretch" style={{ backgroundColor: squad.bg }} />
      ) : null}
      <span
        className="w-1.5 self-stretch"
        style={{ backgroundColor: event?.backgroundColor ?? "#52525b" }}
      />
    </div>
  );
}

/** Pill do calendário: início = cor do elenco, resto = cor do tipo. */
export function AgendaDualTonePill({
  squadLabel,
  squadColor,
  eventStyle,
  children,
  className,
  title,
  onClick,
  compact,
}: {
  squadLabel?: string | null;
  squadColor?: SquadCategoryColor | null;
  eventStyle: EventSwatch;
  children: ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={cn(
        "flex w-full min-w-0 overflow-hidden rounded-md border text-left font-semibold uppercase leading-tight tracking-wide shadow-sm",
        compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs",
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        backgroundColor: eventStyle.backgroundColor,
        color: eventStyle.color,
        borderColor: eventStyle.borderColor,
      }}
    >
      {squadLabel && squadColor ? (
        <span
          className="shrink-0 px-1 py-0.5 font-bold"
          style={{ backgroundColor: squadColor.bg, color: squadColor.text }}
        >
          {squadLabel}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate px-1.5 py-0.5">{children}</span>
    </Comp>
  );
}
