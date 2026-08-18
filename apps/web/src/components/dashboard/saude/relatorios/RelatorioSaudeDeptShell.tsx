"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface RelatorioSaudeDeptShellProps {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  accessModules?: string[];
}

export function RelatorioSaudeDeptShell({
  title,
  children,
  backHref = "/dashboard/saude",
  backLabel = "Depto de Saúde",
  accessModules = ["relatorios_saude", "saude"],
}: RelatorioSaudeDeptShellProps) {
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
        section="Depto de Saúde"
        sectionIcon={Stethoscope}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        accent="violet"
      />
      {children}
    </div>
  );
}
