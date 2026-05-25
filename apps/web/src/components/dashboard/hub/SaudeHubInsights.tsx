"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Calendar,
  ClipboardList,
  Loader2,
  Stethoscope,
  UserCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { HubStatCard } from "./HubStatCard";

interface ConsultationRow {
  id: string;
  date?: string | null;
  time?: string | null;
  status?: string | null;
  playerName?: string | null;
  psychologist?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não compareceu",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#60a5fa",
  confirmed: "#34d399",
  completed: "#22c55e",
  cancelled: "#f87171",
  no_show: "#fbbf24",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function consultationDateTime(c: ConsultationRow): Date | null {
  if (!c.date) return null;
  const iso = c.time ? `${c.date}T${c.time}` : `${c.date}T00:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function SaudeHubInsights() {
  const { canAccessModule } = useAuth();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [medicalCount, setMedicalCount] = useState(0);
  const [psychCount, setPsychCount] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);

  const canSaude = canAccessModule("saude");
  const canPlayers = canAccessModule("tipos");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const tasks: Promise<void>[] = [];

    if (canSaude) {
      tasks.push(
        api
          .get<ConsultationRow[]>("/consultations")
          .then(({ data }) => {
            if (!cancelled) setConsultations(Array.isArray(data) ? data : []);
          })
          .catch(() => {
            if (!cancelled) setConsultations([]);
          }),
      );
      tasks.push(
        api
          .get<unknown[]>("/medical-staff")
          .then(({ data }) => {
            if (!cancelled) setMedicalCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setMedicalCount(0);
          }),
      );
      tasks.push(
        api
          .get<unknown[]>("/psychologists")
          .then(({ data }) => {
            if (!cancelled) setPsychCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setPsychCount(0);
          }),
      );
    }

    if (canPlayers) {
      tasks.push(
        api
          .get<unknown[]>("/players")
          .then(({ data }) => {
            if (!cancelled) setPlayersCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setPlayersCount(0);
          }),
      );
    }

    Promise.all(tasks).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canSaude, canPlayers]);

  const { today, in30Days } = useMemo(() => {
    const t = startOfDay(new Date());
    const end = new Date(t);
    end.setDate(end.getDate() + 30);
    return { today: t, in30Days: end };
  }, []);

  const upcoming = useMemo(() => {
    return consultations
      .filter((c) => {
        const parsed = consultationDateTime(c);
        if (!parsed) return false;
        const d = startOfDay(parsed);
        return d >= today && d <= in30Days && c.status !== "cancelled" && c.status !== "completed";
      })
      .sort((a, b) => {
        const da = consultationDateTime(a)?.getTime() ?? 0;
        const db = consultationDateTime(b)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 6);
  }, [consultations, today, in30Days]);

  const upcomingCount = useMemo(
    () =>
      consultations.filter((c) => {
        const parsed = consultationDateTime(c);
        if (!parsed) return false;
        const d = startOfDay(parsed);
        return d >= today && d <= in30Days && c.status !== "cancelled" && c.status !== "completed";
      }).length,
    [consultations, today, in30Days],
  );

  const chartStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of consultations) {
      const key = c.status ?? "scheduled";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, total]) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      total,
      fill: STATUS_COLORS[status] ?? "#64748b",
    }));
  }, [consultations]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAny =
    consultations.length > 0 || medicalCount > 0 || psychCount > 0 || playersCount > 0;

  if (!hasAny && !canSaude && !canPlayers) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Indicadores</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {canSaude ? (
            <>
              <HubStatCard
                label="Consultas (30 dias)"
                value={upcomingCount}
                hint="Agendamentos próximos"
                icon={Calendar}
                href="/dashboard/consultas"
                accent="from-sky-500/10 to-sky-600/5 border-sky-500/20"
                iconClass="text-sky-600 dark:text-sky-400"
              />
              <HubStatCard
                label="Consultas totais"
                value={consultations.length}
                hint="Histórico e agenda"
                icon={ClipboardList}
                href="/dashboard/consultas"
                accent="from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
                iconClass="text-emerald-600 dark:text-emerald-400"
              />
              <HubStatCard
                label="Equipe médica"
                value={medicalCount}
                hint="Profissionais cadastrados"
                icon={Stethoscope}
                href="/dashboard/medico/equipe"
                accent="from-rose-500/10 to-rose-600/5 border-rose-500/20"
                iconClass="text-rose-600 dark:text-rose-400"
              />
              <HubStatCard
                label="Psicólogos"
                value={psychCount}
                hint="Equipe de psicologia"
                icon={Brain}
                href="/dashboard/psicologia/psicologos"
                accent="from-violet-500/10 to-violet-600/5 border-violet-500/20"
                iconClass="text-violet-600 dark:text-violet-400"
              />
            </>
          ) : null}
          {canPlayers ? (
            <HubStatCard
              label="Atletas"
              value={playersCount}
              hint="Base para prontuários"
              icon={UserCircle}
              href="/dashboard/medico"
              accent="from-amber-500/10 to-amber-600/5 border-amber-500/20"
              iconClass="text-amber-600 dark:text-amber-400"
            />
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        {canSaude ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-sky-500" />
                  Próximas consultas
                </CardTitle>
                <CardDescription>Agenda psicológica nos próximos 30 dias</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href="/dashboard/consultas">Ver consultas</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma consulta agendada nos próximos 30 dias.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((item) => {
                    const when = consultationDateTime(item);
                    return (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="font-medium text-foreground">
                        {item.playerName ?? "Atleta"} · {item.psychologist ?? "Psicólogo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {when
                          ? when.toLocaleString("pt-BR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}{" "}
                        · {STATUS_LABELS[item.status ?? "scheduled"] ?? item.status}
                      </p>
                    </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canSaude && chartStatus.length > 0 ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Consultas por status</CardTitle>
              <CardDescription>Panorama geral da agenda clínica</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" name="Consultas" radius={[6, 6, 0, 0]}>
                    {chartStatus.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {canSaude ? (
        <p className="text-right text-xs text-muted-foreground">
          <Link
            href="/dashboard/consultas"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Abrir consultas online
            <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
