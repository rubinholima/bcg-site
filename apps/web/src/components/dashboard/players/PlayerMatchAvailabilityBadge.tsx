"use client";

import { cn } from "@/lib/utils";
import type { PlayerMatchAvailability } from "@/lib/player-match-availability";

type PlayerMatchAvailabilityBadgeProps = {
  availability: PlayerMatchAvailability;
  /** Exibe motivo abaixo do rótulo (lista). */
  showReason?: boolean;
  className?: string;
};

function badgeClasses(label: PlayerMatchAvailability["label"]): string {
  if (label === "Apto") {
    return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30";
  }
  if (label === "No BID") {
    return "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30";
  }
  return "bg-red-500/15 text-red-400 ring-1 ring-red-500/30";
}

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
          badgeClasses(availability.label),
        )}
      >
        {availability.label}
      </span>
      {showReason && availability.shortReason ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
          {availability.shortReason}
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

function ballClasses(label: PlayerMatchAvailability["label"]): string {
  if (label === "Apto") return "bg-emerald-500/20 text-emerald-300 ring-emerald-500";
  if (label === "No BID") return "bg-amber-500/20 text-amber-300 ring-amber-500";
  return "bg-red-500/20 text-red-300 ring-red-500";
}

function ballTitle(availability: PlayerMatchAvailability): string {
  if (availability.label === "Apto") return "Apto para jogo";
  if (availability.label === "No BID") {
    return availability.reason ?? "No BID — documentação ou registro pendente";
  }
  return availability.reason ?? "Não apto para jogo";
}

/** Bola verde (apto), âmbar (No BID) ou vermelha (não apto) — cabeçalho do atleta. */
export function PlayerMatchAvailabilityBall({
  availability,
  size = "md",
  className,
}: PlayerMatchAvailabilityBallProps) {
  const title = ballTitle(availability);

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full shadow-sm",
        BALL_SIZES[size],
        ballClasses(availability.label),
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

function headerTextClasses(label: PlayerMatchAvailability["label"]): string {
  if (label === "Apto") return "text-emerald-400";
  if (label === "No BID") return "text-amber-400";
  return "text-red-400";
}

function headerTitle(label: PlayerMatchAvailability["label"]): string {
  if (label === "Apto") return "Apto para jogo";
  if (label === "No BID") return "No BID";
  return "Não apto para jogo";
}

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
            headerTextClasses(availability.label),
          )}
        >
          {headerTitle(availability.label)}
        </p>
        {availability.label !== "Apto" && availability.reason ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{availability.reason}</p>
        ) : null}
      </div>
    </div>
  );
}
