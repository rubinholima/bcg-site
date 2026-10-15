"use client";

import { cn } from "@/lib/utils";
import { BCH_PAGE_SHELL } from "@/components/dashboard/boston-city-hall/bch-ui-classes";

/** Container único de páginas BCH — largura útil do shell CUP360. */
export function BchPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(BCH_PAGE_SHELL, className)}>{children}</div>;
}
