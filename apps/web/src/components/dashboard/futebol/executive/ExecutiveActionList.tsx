"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ChevronRight, Circle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutiveActionItem, ExecutiveSeverity } from "@/lib/futebol-executive-types";
import { formatDateDayMonYear } from "@/lib/format-date";

function SeverityIcon({ severity }: { severity: ExecutiveSeverity }) {
  if (severity === "critical") {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />;
  }
  if (severity === "attention") {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
  }
  return <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />;
}

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
  emptyPositive,
  maxHeight,
}: {
  items: ExecutiveActionItem[];
  emptyLabel: string;
  emptyPositive?: boolean;
  maxHeight?: string;
}) {
  if (items.length === 0) {
    return (
      <p
        className={cn(
          "text-center text-xs text-muted-foreground",
          emptyPositive ? "py-3" : "py-4",
          emptyPositive && "text-emerald-400/90",
        )}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul
      className={cn("divide-y divide-border/40", maxHeight && "overflow-y-auto")}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {items.map((item) => {
        const when = formatWhen(item.dueAt ?? item.createdAt);
        return (
          <li key={item.id}>
            <Link
              href={item.actionUrl}
              className="group flex items-center gap-2 py-2 pr-1 transition-colors hover:bg-muted/20"
            >
              <SeverityIcon severity={item.severity} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </div>
              {when ? (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/80">
                  {when}
                </span>
              ) : (
                <Circle className="h-1 w-1 shrink-0 fill-muted-foreground/40 text-transparent" />
              )}
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
