"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const EXEC_PANEL =
  "rounded-xl border border-slate-800/80 bg-[#0c1222]/70 p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.4)] sm:p-5";

export function BchExecutivePanel({
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(EXEC_PANEL, className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
        {href && linkLabel ? (
          <Link href={href} className="text-xs font-medium text-sky-400/90 hover:text-sky-300">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type KpiAccent = "emerald" | "sky" | "violet" | "amber" | "teal" | "rose";

const KPI_ACCENT: Record<
  KpiAccent,
  { ring: string; iconBg: string; iconText: string; spark: string; glow: string }
> = {
  emerald: {
    ring: "border-emerald-500/20",
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-400",
    spark: "#34d399",
    glow: "from-emerald-500/10",
  },
  sky: {
    ring: "border-sky-500/20",
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-400",
    spark: "#38bdf8",
    glow: "from-sky-500/10",
  },
  violet: {
    ring: "border-violet-500/20",
    iconBg: "bg-violet-500/15",
    iconText: "text-violet-400",
    spark: "#a78bfa",
    glow: "from-violet-500/10",
  },
  amber: {
    ring: "border-amber-500/20",
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-400",
    spark: "#fbbf24",
    glow: "from-amber-500/10",
  },
  teal: {
    ring: "border-teal-500/20",
    iconBg: "bg-teal-500/15",
    iconText: "text-teal-400",
    spark: "#2dd4bf",
    glow: "from-teal-500/10",
  },
  rose: {
    ring: "border-rose-500/20",
    iconBg: "bg-rose-500/15",
    iconText: "text-rose-400",
    spark: "#fb7185",
    glow: "from-rose-500/10",
  },
};

const KPI_LINK_CLASS =
  "group relative block overflow-hidden rounded-xl border bg-[#0a101c]/90 p-4 transition-colors hover:border-sky-500/35 hover:bg-[#0d1528]/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 sm:p-4";

export function BchExecutiveKpiCard({
  href,
  navHint,
  label,
  value,
  hint,
  icon: Icon,
  accent,
  sparkline,
  barChart,
  footerStatus,
}: {
  href: string;
  navHint?: string;
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent: KpiAccent;
  sparkline?: number[];
  barChart?: { received: number; open: number };
  /** Quando não há série histórica — texto compacto em vez de gráfico vazio. */
  footerStatus?: string;
}) {
  const tone = KPI_ACCENT[accent];
  const hasChart =
    (barChart && (barChart.received > 0 || barChart.open > 0)) ||
    (sparkline && sparkline.length >= 2 && sparkline.some((v, i, a) => i > 0 && v !== a[0]));
  const showSparkline = sparkline && sparkline.length >= 2;

  return (
    <Link
      href={href}
      title={navHint}
      aria-label={`${label}: ${value}. ${navHint ?? "Abrir destino relacionado."}`}
      className={cn(KPI_LINK_CLASS, tone.ring)}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80 transition-opacity group-hover:opacity-100",
          tone.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/5",
            tone.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", tone.iconText)} aria-hidden />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-sky-500/0 transition-colors group-hover:text-sky-400/90">
          Abrir →
        </span>
      </div>
      <p className="relative mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="relative mt-1 text-[1.65rem] font-bold tabular-nums leading-none tracking-tight text-slate-50 sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="relative mt-1.5 text-xs text-slate-400">{hint}</p> : null}
      {hasChart ? (
        <div className="relative mt-3 h-9 w-full">
          {barChart ? (
            <BchMiniReceivableBars received={barChart.received} open={barChart.open} color={tone.spark} />
          ) : showSparkline ? (
            <BchMiniSparkline values={sparkline!} stroke={tone.spark} />
          ) : null}
        </div>
      ) : footerStatus ? (
        <p className="relative mt-3 text-xs text-slate-500">{footerStatus}</p>
      ) : null}
    </Link>
  );
}

function BchMiniSparkline({
  values,
  stroke,
  flat,
}: {
  values: number[];
  stroke: string;
  flat?: boolean;
}) {
  const w = 120;
  const h = 32;
  const max = flat ? 1 : Math.max(...values, 1);
  const min = flat ? 0 : Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.85}
      />
    </svg>
  );
}

function BchMiniReceivableBars({
  received,
  open,
  color,
}: {
  received: number;
  open: number;
  color: string;
}) {
  const total = received + open;
  const recPct = total > 0 ? (received / total) * 100 : 0;
  const openPct = total > 0 ? (open / total) * 100 : 0;
  return (
    <div className="flex h-full items-end gap-1 px-0.5 pb-0.5">
      <div
        className="min-w-[3px] flex-1 rounded-sm opacity-90"
        style={{ height: `${Math.max(recPct, 8)}%`, backgroundColor: color }}
      />
      <div
        className="min-w-[3px] flex-1 rounded-sm opacity-45"
        style={{ height: `${Math.max(openPct, 8)}%`, backgroundColor: color }}
      />
      <div
        className="min-w-[3px] flex-1 rounded-sm opacity-25"
        style={{ height: `${Math.max(openPct * 0.7, 6)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export type BchPipelineDonutSegment = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export function BchPipelineDonut({
  segments,
  totalLabel,
  stageHref,
  stageNavHint,
}: {
  segments: BchPipelineDonutSegment[];
  totalLabel: string;
  stageHref: (stageKey: string) => string;
  stageNavHint?: string;
}) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative flex h-[108px] w-[108px] items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-[108px] w-[108px] -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-semibold tabular-nums text-slate-100">0</span>
            <span className="text-[10px] text-slate-500">{totalLabel}</span>
          </div>
        </div>
        <p className="text-sm text-slate-500">Funil sem oportunidades ativas.</p>
      </div>
    );
  }

  const slices = segments.filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative mx-auto flex h-[108px] w-[108px] shrink-0 items-center justify-center sm:mx-0">
        <svg viewBox="0 0 100 100" className="h-[108px] w-[108px] -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
          {slices.map((seg) => {
            const frac = seg.count / total;
            const dash = frac * c;
            const gap = c - dash;
            const el = (
              <circle
                key={seg.key}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <Link
          href={stageHref(slices[0]?.key ?? "lead")}
          title={stageNavHint}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        >
          <span className="text-xl font-semibold tabular-nums text-slate-100">{total}</span>
          <span className="max-w-[4.5rem] text-[10px] leading-tight text-slate-500">{totalLabel}</span>
        </Link>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {slices.map((seg) => (
          <li key={seg.key}>
            <Link
              href={stageHref(seg.key)}
              title={stageNavHint}
              className="flex min-h-[40px] items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            >
              <span className="flex min-w-0 items-center gap-2 text-slate-400">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-100">{seg.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BchFinanceProgress({
  totalContracted,
  totalReceived,
  openBalance,
  overdueBalance,
  formatMoney,
  financeHref,
  financeNavHint,
}: {
  totalContracted: number;
  totalReceived: number;
  openBalance: number;
  overdueBalance?: number;
  formatMoney: (n: number) => string;
  financeHref: string;
  financeNavHint?: string;
}) {
  const contracted = totalContracted > 0 ? totalContracted : totalReceived + openBalance;
  const receivedPct = contracted > 0 ? Math.min(100, (totalReceived / contracted) * 100) : 0;
  const openPct = contracted > 0 ? Math.min(100, (openBalance / contracted) * 100) : 0;
  const overdue = overdueBalance ?? 0;
  const overduePct = contracted > 0 ? Math.min(100, (overdue / contracted) * 100) : 0;

  return (
    <div className="space-y-4">
      <Link
        href={financeHref}
        title={financeNavHint}
        className="block rounded-lg p-1 -m-1 transition-colors hover:bg-slate-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
      >
        <p className="text-xs font-medium text-slate-500">Total contratado (venue · USD)</p>
        <p className="text-2xl font-bold tabular-nums text-slate-50 sm:text-[1.75rem]">
          {formatMoney(contracted)}
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
            style={{ width: `${receivedPct}%` }}
          />
        </div>
      </Link>
      <div className="space-y-2">
        <FinanceRowLink
          href={financeHref}
          navHint={financeNavHint}
          label="Recebido"
          value={formatMoney(totalReceived)}
          pct={receivedPct}
          barClass="bg-sky-500/90"
        />
        <FinanceRowLink
          href={financeHref}
          navHint={financeNavHint}
          label="Em aberto"
          value={formatMoney(openBalance)}
          pct={openPct}
          barClass="bg-amber-500/85"
        />
        {overdue > 0 ? (
          <FinanceRowLink
            href={financeHref}
            navHint="Abre Financeiro. Use o filtro Vencido na página."
            label="Vencido"
            value={formatMoney(overdue)}
            pct={overduePct}
            barClass="bg-rose-500/85"
            valueClass="text-rose-300"
          />
        ) : null}
      </div>
    </div>
  );
}

function FinanceRowLink({
  href,
  navHint,
  label,
  value,
  pct,
  barClass,
  valueClass,
}: {
  href: string;
  navHint?: string;
  label: string;
  value: string;
  pct: number;
  barClass: string;
  valueClass?: string;
}) {
  return (
    <Link
      href={href}
      title={navHint}
      className="block min-h-[44px] rounded-lg px-2 py-2 transition-colors hover:bg-slate-900/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
    >
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={cn("font-semibold tabular-nums text-slate-100", valueClass)}>{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800/70">
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] tabular-nums text-slate-600">{pct.toFixed(0)}% do contratado</p>
    </Link>
  );
}

export type BchActivityItem = {
  id: string;
  at: string;
  title: string;
  subtitle?: string;
  href: string;
  tone: "sky" | "amber" | "emerald" | "violet" | "rose";
};

const ACTIVITY_DOT: Record<BchActivityItem["tone"], string> = {
  sky: "bg-sky-400 ring-sky-500/30",
  amber: "bg-amber-400 ring-amber-500/30",
  emerald: "bg-emerald-400 ring-emerald-500/30",
  violet: "bg-violet-400 ring-violet-500/30",
  rose: "bg-rose-400 ring-rose-500/30",
};

export function BchActivityTimeline({ items }: { items: BchActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-4 text-sm text-slate-500">Nenhuma atividade recente registrada.</p>;
  }
  return (
    <ul className="relative space-y-0 pl-1">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-800" aria-hidden />
      {items.map((item) => {
        const time = new Date(item.at);
        const timeLabel = Number.isNaN(time.getTime())
          ? "—"
          : time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            <span
              className={cn(
                "relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2",
                ACTIVITY_DOT[item.tone],
              )}
            />
            <div className="min-w-0 flex-1">
              <Link href={item.href} className="group block rounded-lg pr-1 hover:bg-slate-900/40">
                <p className="text-[11px] tabular-nums text-slate-600">{timeLabel}</p>
                <p className="text-sm font-medium text-slate-200 group-hover:text-sky-200">
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                ) : null}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export type BchExecutiveHeaderStat = {
  label: string;
  value: string;
  href: string;
  title?: string;
};

export function BchExecutiveManagementHeader({
  dateLabel,
  operationSummary,
  pendingActionsCount,
  pendingActionsHref,
  stats,
}: {
  dateLabel: string;
  operationSummary: string;
  pendingActionsCount: number;
  pendingActionsHref: string;
  stats: BchExecutiveHeaderStat[];
}) {
  return (
    <header className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-[#0a101c] via-[#0c1222] to-[#0a101c] px-4 py-4 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <img
            src="/boston-city-hall-logo.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-contain ring-2 ring-amber-500/25 sm:h-12 sm:w-12"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/90">
              Boston City Hall
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">Visão Geral</h1>
            <p className="text-sm text-slate-400">Gestão e operação do estabelecimento</p>
            <p className="mt-1 text-xs text-slate-500">{dateLabel}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-sm text-slate-300">{operationSummary}</p>
          {pendingActionsCount > 0 ? (
            <Link
              href={pendingActionsHref}
              className="inline-flex min-h-[36px] items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-medium text-amber-200/95 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              {pendingActionsCount} ação{pendingActionsCount === 1 ? "" : "ões"} pendente
              {pendingActionsCount === 1 ? "" : "s"}
            </Link>
          ) : (
            <p className="text-xs text-slate-600">Nenhuma ação comercial pendente no momento.</p>
          )}
        </div>
      </div>
      {stats.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              title={s.title}
              className="min-h-[44px] rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2 transition-colors hover:border-sky-500/30 hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="text-sm font-semibold tabular-nums text-slate-100">{s.value}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function leadSparklineFromOverview(points: { count: number }[]): number[] | undefined {
  if (!points.length) return undefined;
  return points.map((p) => p.count);
}

export function leadsWeekOverWeekHint(points: { count: number }[]): string | undefined {
  if (points.length < 14) return undefined;
  const counts = points.map((p) => p.count);
  const last7 = counts.slice(-7).reduce((a, b) => a + b, 0);
  const prior7 = counts.slice(-14, -7).reduce((a, b) => a + b, 0);
  const diff = last7 - prior7;
  if (diff === 0) return "Estável vs. 7 dias anteriores";
  return diff > 0 ? `+${diff} vs. 7 dias anteriores` : `${diff} vs. 7 dias anteriores`;
}
