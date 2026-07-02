"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { INFRA_NAV } from "@/lib/infrastructure-tech-kinds";

export function InfrastructureSubnav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin"
      aria-label="Infraestrutura TI"
    >
      {INFRA_NAV.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px] flex items-center",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
