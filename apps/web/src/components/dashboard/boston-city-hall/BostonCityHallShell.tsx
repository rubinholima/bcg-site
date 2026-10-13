"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BchPageHeader } from "@/components/dashboard/boston-city-hall/BchPageHeader";
import { BchSubNav } from "@/components/dashboard/boston-city-hall/BchSubNav";
import { resolveBchPageMeta } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { useAuth } from "@/context/AuthContext";

export function BostonCityHallShell({
  titleOverride,
  actions,
  children,
}: {
  /** Título pontual (telas dinâmicas). */
  titleOverride?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const { isSuperAdmin } = useAuth();
  const meta = resolveBchPageMeta(pathname, titleOverride);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <Suspense fallback={<div className="h-48 w-full lg:w-[15.5rem] animate-pulse rounded-xl bg-muted/30" />}>
          <BchSubNav showDevItems={isSuperAdmin} />
        </Suspense>
        <div className="min-w-0 flex-1 space-y-4 sm:space-y-5">
          <BchPageHeader title={meta.pageTitle} breadcrumbs={meta.breadcrumbs} actions={actions} />
          {children}
        </div>
      </div>
    </div>
  );
}
