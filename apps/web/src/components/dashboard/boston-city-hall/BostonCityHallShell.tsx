"use client";

import { usePathname } from "next/navigation";
import { BchPageHeader } from "@/components/dashboard/boston-city-hall/BchPageHeader";
import { resolveBchPageMeta } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_MODULE_SCOPE } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";

export function BostonCityHallShell({
  titleOverride,
  actions,
  children,
  hidePageHeader,
}: {
  /** Título pontual (telas dinâmicas). */
  titleOverride?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Centro do evento e listagens com título próprio. */
  hidePageHeader?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const meta = resolveBchPageMeta(pathname, titleOverride);
  const isEventWorkspace = /^\/dashboard\/eventos\/boston-city-hall\/eventos\/[^/]+$/.test(
    pathname.split("?")[0] ?? "",
  );
  const isEventsIndex = pathname.split("?")[0] === "/dashboard/eventos/boston-city-hall/eventos";
  const skipHeader = hidePageHeader || isEventWorkspace || isEventsIndex;

  return (
    <div className={cn("min-w-0 space-y-4 sm:space-y-5", BCH_MODULE_SCOPE)}>
      {!skipHeader ? (
        <BchPageHeader title={meta.pageTitle} breadcrumbs={meta.breadcrumbs} actions={actions} />
      ) : null}
      {children}
    </div>
  );
}
