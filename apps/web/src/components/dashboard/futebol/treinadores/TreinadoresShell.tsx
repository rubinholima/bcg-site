"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { TreinadoresFilters } from "./TreinadoresFilters";
import {
  TREINADORES_BASE,
  TREINADORES_SECTIONS,
  treinadoresLegacyTabRedirect,
  treinadoresSectionFromPath,
} from "./treinadores-nav";

interface TreinadoresShellProps {
  title: string;
  children?: ReactNode;
  showFilters?: boolean;
}

export function TreinadoresShell({
  title,
  children,
  showFilters = true,
}: TreinadoresShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canAccessModule, loading } = useAuth();
  const section = treinadoresSectionFromPath(pathname);

  useEffect(() => {
    if (!loading && !canAccessModule("futebol_treinadores")) {
      router.replace("/403");
    }
  }, [canAccessModule, loading, router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const target = treinadoresLegacyTabRedirect(tab);
    if (!target) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `${target}?${qs}` : target);
  }, [router, searchParams]);

  if (loading || !canAccessModule("futebol_treinadores")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Futebol · Treinadores"
        sectionIcon={ClipboardList}
        title={title}
        backHref={section === "dash" ? "/dashboard/futebol" : TREINADORES_BASE}
        backLabel={section === "dash" ? "Depto de Futebol" : "Treinadores"}
      />

      {section === "dash" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {TREINADORES_SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group block h-full">
                <Card className="h-full border-border/60 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {item.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center text-sm font-medium text-primary">
                      Abrir
                      <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <>
          {showFilters ? <TreinadoresFilters /> : null}
          {children}
        </>
      )}
    </div>
  );
}
