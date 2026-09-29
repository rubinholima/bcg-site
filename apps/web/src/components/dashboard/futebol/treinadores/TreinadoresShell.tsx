"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { TreinadoresContextPanel } from "./TreinadoresContextPanel";
import { TreinadoresFilters } from "./TreinadoresFilters";
import { TreinadoresHubInsights } from "./TreinadoresHubInsights";
import { treinadoresLegacyTabRedirect, treinadoresSectionFromPath } from "./treinadores-nav";
import { canAccessTreinadoresWorkspace } from "./treinadores-access";

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
  const canEnter = canAccessTreinadoresWorkspace(canAccessModule);

  useEffect(() => {
    if (!loading && !canEnter) {
      router.replace("/403");
    }
  }, [canEnter, loading, router]);

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

  if (loading || !canEnter) {
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
        backHref={section === "dash" ? "/dashboard/futebol" : undefined}
        backLabel={section === "dash" ? "Depto de Futebol" : undefined}
      />

      {showFilters ? <TreinadoresFilters /> : null}

      {section === "dash" ? (
        <TreinadoresContextPanel>
          {({ tenantId, category, context, contextLoading, loadError }) => (
            <TreinadoresHubInsights
              tenantId={tenantId}
              category={category}
              context={context}
              contextLoading={contextLoading}
              loadError={loadError}
            />
          )}
        </TreinadoresContextPanel>
      ) : (
        children
      )}
    </div>
  );
}
