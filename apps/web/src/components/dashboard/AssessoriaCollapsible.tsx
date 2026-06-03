"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssessoriaCollapsible({
  title,
  description,
  icon: Icon,
  badge,
  borderClassName,
  contentClassName,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  borderClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className={cn(
        "group rounded-xl border bg-card shadow-sm",
        borderClassName ?? "border-border",
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start gap-3">
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /> : null}
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">{title}</span>
            {description ? (
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span>
            ) : null}
          </span>
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </summary>
      <div className={cn("space-y-5 border-t border-border px-5 py-5", contentClassName)}>{children}</div>
    </details>
  );
}

const EDITOR_TEXTAREA =
  "flex min-h-[12rem] w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ImprensaEditorTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(EDITOR_TEXTAREA, className)}
    />
  );
}
