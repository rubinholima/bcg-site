"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";

export interface WorkflowInboxCounts {
  comprasEnviadas: number;
  financeiroPendentes: number;
  diretoriaPendentes: number;
  tiAbertos: number;
}

interface WorkflowInboxBannerProps {
  tenantId?: string;
  /** compras | financeiro | diretoria | ti */
  variant: "compras" | "financeiro" | "diretoria" | "ti";
}

const VARIANT_CONFIG = {
  compras: {
    countKey: "comprasEnviadas" as const,
    label: "nova(s) requisição(ões) aguardando triagem",
    href: "/dashboard/adm/compras",
  },
  financeiro: {
    countKey: "financeiroPendentes" as const,
    label: "requisição(ões) aguardando sua aprovação",
    href: "/dashboard/adm/financeiro/aprovacoes",
  },
  diretoria: {
    countKey: "diretoriaPendentes" as const,
    label: "requisição(ões) aguardando aprovação da diretoria",
    href: "/dashboard/diretoria/aprovacoes-compras",
  },
  ti: {
    countKey: "tiAbertos" as const,
    label: "chamado(s) TI em aberto",
    href: "/dashboard/adm/ti",
  },
};

export function WorkflowInboxBanner({ tenantId, variant }: WorkflowInboxBannerProps) {
  const [counts, setCounts] = useState<WorkflowInboxCounts | null>(null);

  useEffect(() => {
    const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    const load = () => {
      api
        .get<WorkflowInboxCounts>(`/compras/workflow/inbox-counts${params}`)
        .then(({ data }) => setCounts(data))
        .catch(() => setCounts(null));
    };
    load();
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [tenantId]);

  const cfg = VARIANT_CONFIG[variant];
  const n = counts ? counts[cfg.countKey] : 0;
  if (!n) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
    >
      <Bell className="h-5 w-5 shrink-0 text-amber-500" />
      <span>
        <strong>{n}</strong> {cfg.label}
        {tenantId ? "" : " (todas as empresas)"}.
      </span>
      <Link href={cfg.href} className="font-medium text-primary underline-offset-4 hover:underline">
        Ver fila
      </Link>
    </div>
  );
}
