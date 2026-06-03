"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FutebolAgendaOperacional } from "@/components/dashboard/futebol/FutebolAgendaOperacional";
import { useAuth } from "@/context/AuthContext";

function AgendaContent() {
  return <FutebolAgendaOperacional />;
}

export default function FutebolLogisticaAgendaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("futebol_logistica")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("futebol_logistica")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/futebol"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Depto Futebol
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Logística — Agenda operacional</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Calendário unificado: viagens, treinos, jogos, reuniões, compromissos dos clubes e eventos do{" "}
          <Link href="/dashboard/eventos/boston-city-hall/reservas" className="text-primary underline-offset-2 hover:underline">
            Boston City Hall (palco)
          </Link>
          . Jogos FMF atualizam automaticamente a cada 2 horas.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AgendaContent />
      </Suspense>
    </div>
  );
}
