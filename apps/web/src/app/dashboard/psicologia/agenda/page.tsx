"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { PsicologiaAgendaOperacional } from "@/components/dashboard/psychology/PsicologiaAgendaOperacional";
import { useAuth } from "@/context/AuthContext";

export default function PsicologiaAgendaPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("saude")) router.replace("/403");
  }, [canAccessModule, loading, router]);

  if (loading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader section="Psicologia" sectionIcon={Calendar} title="Agenda Psicologia" />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <PsicologiaAgendaOperacional />
      </Suspense>
    </div>
  );
}
