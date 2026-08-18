"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface RelatorioAdmDeptShellProps {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  accessModules?: string[];
}

export function RelatorioAdmDeptShell({
  title,
  children,
  backHref = "/dashboard/adm",
  backLabel = "Depto Adm",
  accessModules = ["relatorios_adm", "adm_compras", "adm_estoque"],
}: RelatorioAdmDeptShellProps) {
  const router = useRouter();
  const { canAccessModule, isCompanyAdmin, isSuperAdmin, loading } = useAuth();

  const canAccess =
    isSuperAdmin ||
    isCompanyAdmin ||
    accessModules.some((slug) => canAccessModule(slug));

  useEffect(() => {
    if (!loading && !canAccess) {
      router.replace("/403");
    }
  }, [loading, canAccess, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto Adm"
        sectionIcon={Building2}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        accent="emerald"
      />
      {children}
    </div>
  );
}
