"use client";

import { BCH_MODULE_SCOPE } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";

/** Wrapper de conteúdo BCH — navegação e título ficam no App Shell. */
export function BostonCityHallShell({
  children,
}: {
  titleOverride?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  hidePageHeader?: boolean;
}) {
  return <div className={cn("min-w-0 space-y-4 sm:space-y-5", BCH_MODULE_SCOPE)}>{children}</div>;
}
