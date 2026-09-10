"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock3, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { Button } from "@/components/ui/button";
import type { LearningHubResponse } from "@/lib/desenvolvimento-types";
import { formatDateTimeDayMonYear } from "@/lib/format-date";

export default function DesenvolvimentoHubPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [hub, setHub] = useState<LearningHubResponse | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("desenvolvimento")) {
      router.replace("/dashboard");
      return;
    }
    void api.get<LearningHubResponse>("/desenvolvimento/hub").then(({ data }) => setHub(data));
  }, [authLoading, canAccessModule, router]);

  const cont = hub?.continueLearning;

  return (
    <Cup360PageShell>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Matriculados" value={hub?.totals.enrolled ?? "—"} icon={GraduationCap} />
        <KpiCard label="Em andamento" value={hub?.totals.inProgress ?? "—"} icon={BookOpen} tone="info" />
        <KpiCard label="Concluídos" value={hub?.totals.completed ?? "—"} icon={BookOpen} tone="success" />
        <KpiCard label="Atrasados" value={hub?.totals.overdue ?? "—"} icon={Clock3} tone="warning" />
      </div>

      <section className="mt-6 rounded-lg border border-border/60 bg-muted/10 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Continuar aprendendo</h2>
        {cont ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{cont.course.title}</p>
              <p className="text-sm text-muted-foreground">{cont.progressPct}% · {cont.status}</p>
              {cont.mandatory && cont.dueAt ? (
                <p className="text-xs text-amber-500">Prazo: {formatDateTimeDayMonYear(cont.dueAt)}</p>
              ) : null}
            </div>
            <Button asChild>
              <Link href={`/dashboard/desenvolvimento/curso/${cont.course.id}`}>Continuar</Link>
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum curso em andamento.</p>
        )}
      </section>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/dashboard/desenvolvimento/meus-cursos">Meus cursos</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/dashboard/desenvolvimento/catalogo">Catálogo</Link>
        </Button>
        {canAccessModule("desenvolvimento__desenvolvimento_admin") ? (
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/dashboard/desenvolvimento/admin">Administração</Link>
          </Button>
        ) : null}
      </div>
    </Cup360PageShell>
  );
}
