"use client";

import { cn } from "@/lib/utils";
import type { PlayerMatchAvailability } from "@/lib/player-match-availability";

type PlayerMatchAvailabilityBadgeProps = {
  availability: PlayerMatchAvailability;
  /** Exibe motivo abaixo do rótulo (lista). */
  showReason?: boolean;
  className?: string;
};

export function PlayerMatchAvailabilityBadge({
  availability,
  showReason = true,
  className,
}: PlayerMatchAvailabilityBadgeProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          availability.apto
            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
            : "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
        )}
      >
        {availability.label}
      </span>
      {showReason && availability.shortReason ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
          {availability.shortReason}
        </p>
      ) : null}
      {showReason && availability.warning ? (
        <p className="mt-0.5 text-[11px] leading-snug text-amber-500/90 line-clamp-2">
          {availability.warning}
        </p>
      ) : null}
    </div>
  );
}

type PlayerMatchAvailabilityBallProps = {
  availability: PlayerMatchAvailability;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const BALL_SIZES = {
  sm: "h-7 w-7 text-sm ring-[1.5px]",
  md: "h-9 w-9 text-base ring-2",
  lg: "h-11 w-11 text-lg ring-2",
} as const;

/** Bola verde (apto) ou vermelha (não apto) — cabeçalho do atleta. */
export function PlayerMatchAvailabilityBall({
  availability,
  size = "md",
  className,
}: PlayerMatchAvailabilityBallProps) {
  const title = availability.apto
    ? "Apto para jogo"
    : availability.reason ?? "Não apto para jogo";

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full shadow-sm",
        BALL_SIZES[size],
        availability.apto
          ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500"
          : "bg-red-500/20 text-red-300 ring-red-500",
        className,
      )}
    >
      ⚽
    </span>
  );
}

type PlayerMatchAvailabilityHeaderProps = {
  availability: PlayerMatchAvailability;
  className?: string;
};

/** Linha compacta ao lado do nome — bola + texto quando não apto. */
export function PlayerMatchAvailabilityHeader({
  availability,
  className,
}: PlayerMatchAvailabilityHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PlayerMatchAvailabilityBall availability={availability} size="sm" />
      <div className="min-w-0">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            availability.apto ? "text-emerald-400" : "text-red-400",
          )}
        >
          {availability.apto ? "Apto para jogo" : "Não apto para jogo"}
        </p>
        {!availability.apto && availability.reason ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{availability.reason}</p>
        ) : null}
      </div>
    </div>
  );
}
