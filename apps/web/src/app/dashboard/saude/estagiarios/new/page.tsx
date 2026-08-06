"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { HealthInternForm } from "@/components/dashboard/saude/HealthInternForm";
import { useAuth } from "@/context/AuthContext";

export default function NovoEstagiarioPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Saúde"
        sectionIcon={GraduationCap}
        title="Novo estagiário"
        backHref="/dashboard/saude/estagiarios"
        compact
      />
      <HealthInternForm
        mode="create"
        cancelHref="/dashboard/saude/estagiarios"
        onSaved={() => router.push("/dashboard/saude/estagiarios?success=true")}
      />
    </div>
  );
}
