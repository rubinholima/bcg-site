"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { HealthInternForm } from "@/components/dashboard/saude/HealthInternForm";
import { useAuth } from "@/context/AuthContext";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";

export default function EditarEstagiarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
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
        title="Editar estagiário"
        backHref="/dashboard/saude/estagiarios"
        compact
      />
      <HealthInternForm
        mode="edit"
        internId={id}
        cancelHref="/dashboard/saude/estagiarios"
        onSaved={() => notifySaved()}
      />
      <SaveSuccessModal />
    </div>
  );
}
