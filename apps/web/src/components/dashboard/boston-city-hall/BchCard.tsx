"use client";

import { cn } from "@/lib/utils";
import { BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";

export function BchCard({
  title,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn(BCH_CARD, className)}>
      {title || actions ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="text-sm font-semibold text-slate-100">{title}</h2> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
