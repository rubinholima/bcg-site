"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Shirt } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface RelatorioFutebolDeptShellProps {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Módulos que podem acessar. Padrão: relatorios_futebol */
  accessModules?: string[];
}

export function RelatorioFutebolDeptShell({
  title,
  children,
  backHref = "/dashboard/futebol",
  backLabel = "Depto de Futebol",
  accessModules = ["relatorios_futebol"],
}: RelatorioFutebolDeptShellProps) {
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
        section="Depto de Futebol"
        sectionIcon={Shirt}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
      />
      {children}
    </div>
  );
}
