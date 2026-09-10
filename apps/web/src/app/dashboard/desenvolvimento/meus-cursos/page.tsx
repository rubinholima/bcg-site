"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { Button } from "@/components/ui/button";
import type { LearningEnrollmentRow } from "@/lib/desenvolvimento-types";
import { formatDateTimeDayMonYear } from "@/lib/format-date";

export default function DesenvolvimentoMeusCursosPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();
  const [items, setItems] = useState<LearningEnrollmentRow[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!canAccessModule("desenvolvimento")) {
      router.replace("/dashboard");
      return;
    }
    void api.get<LearningEnrollmentRow[]>("/desenvolvimento/my-courses").then(({ data }) => setItems(Array.isArray(data) ? data : []));
  }, [canAccessModule, loading, router]);

  return (
    <Cup360PageShell>
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-border/60 bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h2 className="font-semibold">{item.course.title}</h2>
              <p className="text-sm text-muted-foreground">
                {item.progressPct}% · {item.status}
                {item.course.tenant?.name ? ` · ${item.course.tenant.name}` : ""}
              </p>
              {item.mandatory ? (
                <p className="text-xs text-amber-500">
                  Obrigatório{item.dueAt ? ` · até ${formatDateTimeDayMonYear(item.dueAt)}` : ""}
                </p>
              ) : null}
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/dashboard/desenvolvimento/curso/${item.course.id}`}>Abrir</Link>
            </Button>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma matrícula ativa.</p>
        ) : null}
      </div>
    </Cup360PageShell>
  );
}
