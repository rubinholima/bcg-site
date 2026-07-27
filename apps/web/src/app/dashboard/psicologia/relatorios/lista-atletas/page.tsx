"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PsicologiaAtletasReportForm } from "@/components/dashboard/psychology/PsicologiaAtletasReportForm";
import { useAuth } from "@/context/AuthContext";

export default function PsicologiaListaAtletasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("saude")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/psicologia/relatorios">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Relatórios
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#6d28d9]" />
          <h1 className="text-xl font-semibold">Relatório — Lista de atletas</h1>
        </div>
      </div>

      <PsicologiaAtletasReportForm />
    </div>
  );
}
