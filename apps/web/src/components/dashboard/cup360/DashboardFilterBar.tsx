"use client";

import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";

type DashboardFilterBarProps = {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
};

/** Barra de filtros canônica CUP360 — search, selects, datas na mesma linha compacta. */
export function DashboardFilterBar({ children, className, actions }: DashboardFilterBarProps) {
  return (
    <div className={cn(cup360.filterBar, className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FilterBarField({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-[8rem] flex-1 space-y-1.5 sm:max-w-[14rem]", className)}>
      {label ? <span className={cup360.type.caption}>{label}</span> : null}
      {children}
    </div>
  );
}
