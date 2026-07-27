"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";

interface FutebolRelatorioShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function FutebolRelatorioShell({ title, description, children }: FutebolRelatorioShellProps) {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("relatorios_futebol")) {
      router.replace("/403");
    }
  }, [loading, canAccessModule, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("relatorios_futebol")) return null;

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto Futebol"
        sectionIcon={BarChart3}
        title={title}
        description={description}
      />
      {children}
    </div>
  );
}
