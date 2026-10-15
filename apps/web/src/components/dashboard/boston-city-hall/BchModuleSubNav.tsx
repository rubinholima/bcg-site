"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BchSubNavItem } from "@/components/dashboard/boston-city-hall/bch-subnav.config";
import { cn } from "@/lib/utils";

function isSubNavActive(pathname: string, item: BchSubNavItem): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  const hrefPath = item.href.split("?")[0] ?? item.href;
  if (item.exact) return path === hrefPath;
  return path === hrefPath || path.startsWith(`${hrefPath}/`);
}

export function BchModuleSubNav({ items, ariaLabel }: { items: BchSubNavItem[]; ariaLabel: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800/70 bg-[#0a0f1a]/50 p-1"
    >
      {items.map((item) => {
        const active = isSubNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-[40px] items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-[13px]",
              active
                ? "bg-sky-500/15 text-sky-50 ring-1 ring-sky-500/35"
                : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-100",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
