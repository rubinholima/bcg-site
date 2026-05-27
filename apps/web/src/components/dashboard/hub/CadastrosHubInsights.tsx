"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Loader2,
  Stethoscope,
  Ticket,
  Trophy,
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
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { HubStatCard } from "./HubStatCard";

interface PlayerRow {
  category?: string | null;
}

const CATEGORY_COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6", "#94a3b8"];

export function CadastrosHubInsights() {
  const { canAccessModule } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playersCount, setPlayersCount] = useState(0);
  const [championshipsCount, setChampionshipsCount] = useState(0);
  const [medicalCount, setMedicalCount] = useState(0);
  const [psychCount, setPsychCount] = useState(0);
  const [plansCount, setPlansCount] = useState(0);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const canPlayers = canAccessModule("tipos");
  const canSaude = canAccessModule("saude");
  const canSocio = canAccessModule("socio_torcedor");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const tasks: Promise<void>[] = [];

    if (canPlayers) {
      tasks.push(
        api
          .get<PlayerRow[]>("/players")
          .then(({ data }) => {
            if (cancelled) return;
            const rows = Array.isArray(data) ? data : [];
            setPlayers(rows);
            setPlayersCount(rows.length);
          })
          .catch(() => {
            if (!cancelled) {
              setPlayers([]);
              setPlayersCount(0);
            }
          }),
      );
      tasks.push(
        api
          .get<unknown[]>("/championships")
          .then(({ data }) => {
            if (!cancelled) setChampionshipsCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setChampionshipsCount(0);
          }),
      );
    }

    if (canSaude) {
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

    if (canSocio) {
      tasks.push(
        api
          .get<unknown[]>("/socio/plans")
          .then(({ data }) => {
            if (!cancelled) setPlansCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setPlansCount(0);
          }),
      );
    }

    Promise.all(tasks).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canPlayers, canSaude, canSocio]);

  const chartCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of players) {
      const key = p.category?.trim() || "Sem categoria";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, total], index) => ({
        label,
        total,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [players]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAny =
    playersCount > 0 ||
    championshipsCount > 0 ||
    medicalCount > 0 ||
    psychCount > 0 ||
    plansCount > 0;

  if (!hasAny && !canPlayers && !canSaude && !canSocio) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Indicadores</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {canPlayers ? (
            <>
              <HubStatCard
                label={DASHBOARD_LABELS.atletas}
                value={playersCount}
                hint="Jogadores por clube"
                icon={UserCircle}
                href="/dashboard/cadastros/jogadores"
                accent="from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
                iconClass="text-emerald-600 dark:text-emerald-400"
              />
              <HubStatCard
                label="Campeonatos"
                value={championshipsCount}
                hint="Competições cadastradas"
                icon={Trophy}
                href="/dashboard/cadastros/campeonatos"
                accent="from-amber-500/10 to-amber-600/5 border-amber-500/20"
                iconClass="text-amber-600 dark:text-amber-400"
              />
            </>
          ) : null}
          {canSaude ? (
            <>
              <HubStatCard
                label="Equipe médica"
                value={medicalCount}
                hint="Profissionais credenciados"
                icon={Stethoscope}
                href="/dashboard/medico/equipe"
                accent="from-rose-500/10 to-rose-600/5 border-rose-500/20"
                iconClass="text-rose-600 dark:text-rose-400"
              />
              <HubStatCard
                label="Psicólogos"
                value={psychCount}
                hint="Profissionais de psicologia"
                icon={Brain}
                href="/dashboard/psicologia/psicologos"
                accent="from-sky-500/10 to-sky-600/5 border-sky-500/20"
                iconClass="text-sky-600 dark:text-sky-400"
              />
            </>
          ) : null}
          {canSocio ? (
            <HubStatCard
              label="Planos sócio"
              value={plansCount}
              hint="Planos e benefícios"
              icon={Ticket}
              href="/dashboard/socio-torcedor/planos"
              accent="from-indigo-500/10 to-indigo-600/5 border-indigo-500/20"
              iconClass="text-indigo-600 dark:text-indigo-400"
            />
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        {canPlayers && chartCategories.length > 0 ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">{DASHBOARD_LABELS.atletas} por categoria</CardTitle>
              <CardDescription>Distribuição do elenco cadastrado</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCategories} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
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
                  <Bar dataKey="total" name="Atletas" radius={[6, 6, 0, 0]}>
                    {chartCategories.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <p className="text-right text-xs text-muted-foreground">
        <Link
          href="/dashboard/cadastros/jogadores"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Gerenciar cadastros
          <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}
