"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function FutebolAgendaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("futebol_logistica") && !canAccessModule("futebol_analise")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading) {
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
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Calendar className="h-8 w-8" />
          Agenda — Depto Futebol
        </h1>
        <p className="mt-1 text-muted-foreground">Calendário e compromissos do departamento — em construção.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>Jogos, treinos, viagens e eventos do futebol centralizados nesta agenda.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Enquanto isso, use Logística e os cadastros de campeonatos para planejamento.
        </CardContent>
      </Card>
    </div>
  );
}
