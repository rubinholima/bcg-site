"use client";

import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";

type Cup360PageShellProps = {
  children: React.ReactNode;
  /** Ações alinhadas à direita (filtros, botões) — sem repetir título. */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Composição canônica de página CUP360.
 * Título/contexto vêm do DashboardPageFrame — não repetir aqui.
 */
export function Cup360PageShell({ children, actions, className }: Cup360PageShellProps) {
  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
      {children}
    </div>
  );
}

export function PageSection({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className={cup360.type.sectionTitle}>{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SidebarAreaLabel({ label }: { label: string }) {
  return (
    <p
      className={cn(cup360.sidebar.areaLabel, "px-2.5 pb-1 pt-3 first:pt-1")}
      role="presentation"
    >
      {label}
    </p>
  );
}
