"use client";

import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXECUTIVE_SEVERITY_CLASS,
  EXECUTIVE_SEVERITY_LABEL,
} from "@/lib/futebol-executive-access";
import type { ExecutiveActionItem } from "@/lib/futebol-executive-types";
import { formatDateDayMonYear } from "@/lib/format-date";

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  try {
    return formatDateDayMonYear(iso.slice(0, 10));
  } catch {
    return null;
  }
}

export function ExecutiveActionList({
  items,
  emptyLabel,
  compact,
}: {
  items: ExecutiveActionItem[];
  emptyLabel: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ul className={cn("divide-y divide-border/60", compact && "max-h-[420px] overflow-y-auto")}>
      {items.map((item) => {
        const when = formatWhen(item.dueAt ?? item.createdAt);
        return (
          <li key={item.id}>
            <Link
              href={item.actionUrl}
              className="group flex items-start gap-3 px-1 py-2.5 transition-colors hover:bg-muted/30"
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  EXECUTIVE_SEVERITY_CLASS[item.severity] ?? EXECUTIVE_SEVERITY_CLASS.info,
                )}
              >
                {EXECUTIVE_SEVERITY_LABEL[item.severity] ?? item.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
                {when ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                    <Clock className="h-3 w-3" />
                    {when}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
