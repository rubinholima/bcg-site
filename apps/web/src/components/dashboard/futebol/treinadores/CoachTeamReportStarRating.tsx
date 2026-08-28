"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ratingToFilledStars } from "./coach-team-report-utils";

interface Props {
  value: number | null | undefined;
  size?: "sm" | "md";
  readOnly?: boolean;
  onChange?: (value: number | null) => void;
  className?: string;
}

const SIZE_CLASS = {
  sm: "h-3 w-3",
  md: "h-5 w-5",
} as const;

export function CoachTeamReportStarRating({
  value,
  size = "md",
  readOnly = true,
  onChange,
  className,
}: Props) {
  const filled = ratingToFilledStars(value);
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`Nota ${star}`}
          className={cn("rounded p-0.5", readOnly ? "cursor-default" : "hover:bg-muted/60")}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={cn(
              SIZE_CLASS[size],
              star <= filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35",
            )}
          />
        </button>
      ))}
    </div>
  );
}
