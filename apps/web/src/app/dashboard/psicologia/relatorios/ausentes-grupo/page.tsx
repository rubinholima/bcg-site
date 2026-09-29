"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PsicologiaGrupoAusentesReport } from "@/components/dashboard/psychology/PsicologiaGrupoAusentesReport";

export default function PsicologiaAusentesGrupoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!canAccessModule("saude")) {
    router.replace("/403");
    return null;
  }

  return <PsicologiaGrupoAusentesReport />;
}
