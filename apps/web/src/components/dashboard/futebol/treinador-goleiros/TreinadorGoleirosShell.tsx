"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { TreinadorGoleirosFilters } from "./TreinadorGoleirosFilters";
import { TREINADOR_GOLEIROS_NAV } from "./treinador-goleiros-nav";

interface Props {
  title: string;
  children: ReactNode;
  showFilters?: boolean;
}

export function TreinadorGoleirosShell({ title, children, showFilters = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_treinador_goleiros")) {
      router.replace("/403");
    }
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("futebol_treinador_goleiros")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Futebol · Treinador de goleiros"
        sectionIcon={Shield}
        title={title}
        backHref="/dashboard/futebol"
        backLabel="Depto de Futebol"
      />

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TREINADOR_GOLEIROS_NAV.map((item) => {
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

      {showFilters ? <TreinadorGoleirosFilters /> : null}
      {children}
    </div>
  );
}
