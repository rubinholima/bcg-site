"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  BCH_NAV_GROUPS,
  bchNavGroupsForMenu,
  isBchNavItemActive,
  type BchNavGroupId,
} from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { cn } from "@/lib/utils";

function groupContainsActive(pathname: string, groupId: BchNavGroupId): boolean {
  const group = BCH_NAV_GROUPS.find((g) => g.id === groupId);
  if (!group) return false;
  return group.items.some((item) => isBchNavItemActive(pathname, item));
}

export function BchSubNav({ showDevItems }: { showDevItems: boolean }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const groups = useMemo(() => bchNavGroupsForMenu(showDevItems), [showDevItems]);

  function itemActive(item: (typeof groups)[number]["items"][number]): boolean {
    if (item.href.includes("?")) {
      const [path, query] = item.href.split("?");
      if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
      const expected = new URLSearchParams(query);
      for (const [k, v] of expected.entries()) {
        if (searchParams.get(k) !== v) return false;
      }
      return true;
    }
    return isBchNavItemActive(pathname, item);
  }

  const [open, setOpen] = useState<Record<BchNavGroupId, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of BCH_NAV_GROUPS) {
      initial[g.id] = groupContainsActive(pathname, g.id);
    }
    return initial as Record<BchNavGroupId, boolean>;
  });

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      for (const g of BCH_NAV_GROUPS) {
        if (groupContainsActive(pathname, g.id)) next[g.id] = true;
      }
      return next;
    });
  }, [pathname]);

  return (
    <nav aria-label="Boston City Hall" className="w-full lg:w-[15.5rem] lg:shrink-0">
      <div className="space-y-2 rounded-xl border border-slate-800/90 bg-slate-950/40 p-2">
        {groups.map((group) => {
          const expanded = open[group.id] ?? false;
          return (
            <div key={group.id} className="rounded-lg border border-transparent">
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [group.id]: !expanded }))}
                className="flex min-h-[40px] w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                aria-expanded={expanded}
              >
                {group.label}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <ul className="space-y-0.5 pb-1 pl-1">
                  {group.items.map((item) => {
                    const active = itemActive(item);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex min-h-[40px] items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/25"
                              : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-100",
                            item.devOnly && "text-slate-500",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
