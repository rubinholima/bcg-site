"use client";

import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";
import type { LiveUserItem } from "@/lib/master-ops-types";
import { formatRoleSlug } from "@/lib/platform-roles";

export function OpsSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(cup360.surface1, "min-w-0 overflow-hidden", className)}>
      <div className="flex flex-col gap-1 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className={cup360.type.sectionTitle}>{title}</h2>
          {description ? <p className={cn(cup360.type.caption, "mt-0.5")}>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function UserAvatar({
  name,
  username,
  status,
}: {
  name: string | null;
  username: string;
  status?: LiveUserItem["status"];
}) {
  const label = (name || username).trim();
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || username.slice(0, 2).toUpperCase();

  return (
    <div className="relative shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-xs font-semibold text-foreground">
        {initials}
      </div>
      {status ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
            status === "online" ? "bg-emerald-500" : "bg-amber-500",
          )}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export function PresenceStatusBadge({ status }: { status: LiveUserItem["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        status === "online"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "online" ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {status === "online" ? "Online" : "Ocioso"}
    </span>
  );
}

export function formatLiveUserRole(role: string | null | undefined) {
  return formatRoleSlug(role ?? "user");
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Exibição compacta na lista: primeiro + último nome (cadastro completo inalterado). */
export function formatCompactDisplayName(name: string | null, username: string): string {
  const raw = (name || username).trim();
  if (!name?.trim()) return raw;
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return titleCaseWord(parts[0] ?? username);
  return `${titleCaseWord(parts[0])} ${titleCaseWord(parts[parts.length - 1])}`;
}

export function liveUserCompanyKey(item: LiveUserItem): string {
  return item.tenant?.id ?? item.tenant?.name ?? "__master__";
}

export function liveUserCompanyLabel(item: LiveUserItem): string {
  return item.tenant?.name ?? "Grupo Master";
}

export function formatCompactActivityTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Paleta neutra para gráficos do Master Dashboard. */
export const MASTER_CHART_COLORS = [
  "hsl(262 52% 58%)",
  "hsl(215 16% 52%)",
  "hsl(199 65% 48%)",
  "hsl(152 45% 42%)",
  "hsl(38 70% 48%)",
  "hsl(0 55% 52%)",
  "hsl(280 35% 52%)",
  "hsl(173 40% 42%)",
] as const;

export function MasterChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-medium text-foreground">{label}</p> : null}
      <p className="tabular-nums text-muted-foreground">
        {payload[0]?.value ?? 0} usuário(s)
      </p>
    </div>
  );
}
