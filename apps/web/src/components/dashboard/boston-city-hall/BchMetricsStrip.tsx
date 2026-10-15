"use client";

import Link from "next/link";
import { BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";

export type BchMetricItem = {
  label: string;
  value: string | number;
  href?: string;
  title?: string;
};

export function BchMetricsStrip({
  title = "Resumo",
  items,
  footer,
  className,
}: {
  title?: string;
  items: BchMetricItem[];
  footer?: React.ReactNode;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className={cn(BCH_CARD, "p-3 sm:p-4", className)}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <div
        className={cn(
          "grid gap-2",
          items.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
        )}
      >
        {items.map((m) => {
          const inner = (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-100">{m.value}</p>
            </>
          );
          const boxClass =
            "rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-sky-500/35 hover:bg-slate-900/50";
          if (m.href) {
            return (
              <Link key={m.label} href={m.href} title={m.title} className={boxClass}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={m.label} title={m.title} className={boxClass}>
              {inner}
            </div>
          );
        })}
      </div>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </section>
  );
}
