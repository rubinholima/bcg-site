"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: ReactNode;
  className?: string;
}

export function ExpandableSection({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
  className,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {badge != null && badge !== "" ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="border-t border-border/60 px-4 py-5 sm:px-5">{children}</div> : null}
    </div>
  );
}

interface FormGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 6;
}

export function FormGrid({ children, cols = 3 }: FormGridProps) {
  const colClass =
    cols === 6
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      : cols === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : cols === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={cn("grid gap-4", colClass)}>{children}</div>;
}

export function SectionDivider({ title }: { title: string }) {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
    </div>
  );
}

export function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}
