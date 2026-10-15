"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BCH_BTN_SECONDARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BchQuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

export function BchQuickLinkGrid({
  links,
  className,
  columns = 2,
}: {
  links: BchQuickLink[];
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  const colClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <div className={cn("grid gap-2", colClass, className)}>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Button
            key={link.href + link.label}
            asChild
            variant={link.primary ? "default" : "outline"}
            className={cn(
              "min-h-[44px] justify-start gap-2.5",
              link.primary ? undefined : cn(BCH_BTN_SECONDARY, "border-slate-700/90 bg-slate-950/30 hover:border-sky-500/30"),
            )}
          >
            <Link href={link.href}>
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              <span className="truncate text-xs sm:text-sm">{link.label}</span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
