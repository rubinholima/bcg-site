"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { PrepFisicaFilters } from "./PrepFisicaFilters";
import { PREP_FISICA_NAV } from "./prep-fisica-nav";

interface Props {
  title: string;
  children: ReactNode;
}

export function PrepFisicaShell({ title, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_preparacao_fisica")) {
      router.replace("/403");
    }
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("futebol_preparacao_fisica")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Futebol · Preparação física"
        sectionIcon={Dumbbell}
        title={title}
        backHref="/dashboard/futebol/performance"
        backLabel="Performance"
      />

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {PREP_FISICA_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <PrepFisicaFilters />
      {children}
    </div>
  );
}
