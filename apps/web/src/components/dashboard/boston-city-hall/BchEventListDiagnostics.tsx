"use client";

import Link from "next/link";
import { AlertTriangle, FlaskConical, Inbox, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BCH_BTN_PRIMARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { cn } from "@/lib/utils";

export function BchEventListDiagnostics({
  loading,
  error,
  rawCount,
  operationalCount,
  smokeHiddenCount,
  onRetry,
  onCreateEvent,
  compact,
}: {
  loading?: boolean;
  error: string | null;
  rawCount: number;
  operationalCount: number;
  smokeHiddenCount: number;
  onRetry?: () => void;
  onCreateEvent?: () => void;
  compact?: boolean;
}) {
  if (loading) return null;

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-500/30 bg-red-500/10 p-4",
          compact && "p-3",
        )}
        role="alert"
      >
        <div className="flex gap-3">
          <ServerCrash className="h-5 w-5 shrink-0 text-red-300" aria-hidden />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-red-100">Falha ao carregar eventos</p>
            <p className="text-xs text-red-200/90">{error}</p>
            <p className="text-xs text-red-200/70">
              Verifique se a API está no ar (porta 3001) e se sua sessão tem acesso ao módulo Eventos /
              tenant Boston City Hall.
            </p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" className="min-h-[40px]" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (operationalCount > 0) return null;

  if (rawCount === 0) {
    return (
      <BchEmptyState
        icon={Inbox}
        message="Nenhum evento cadastrado no Boston City Hall. Crie um rascunho para configurar ingressos e publicação."
        action={
          onCreateEvent ? (
            <Button type="button" className={cn("min-h-[44px]", BCH_BTN_PRIMARY)} onClick={onCreateEvent}>
              Criar evento
            </Button>
          ) : (
            <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
              <Link href={`${BCH_BASE}/reservas`}>Ir para reservas</Link>
            </Button>
          )
        }
      />
    );
  }

  if (smokeHiddenCount > 0 && operationalCount === 0) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <FlaskConical className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-amber-100">Só registros de teste (smoke) no tenant</p>
            <p className="text-xs text-amber-100/85">
              {rawCount} evento(s) na API; {smokeHiddenCount} oculto(s) da operação. Crie um evento comercial
              ou confirme uma reserva e gere o evento a partir dela.
            </p>
            {onCreateEvent ? (
              <Button
                type="button"
                size="sm"
                className={cn("mt-2 min-h-[40px]", BCH_BTN_PRIMARY)}
                onClick={onCreateEvent}
              >
                Criar evento comercial
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
        <p className="text-sm text-slate-300">
          Nenhum evento disponível para seleção ({rawCount} no tenant). Filtros operacionais podem estar
          ocultando registros de teste.
        </p>
      </div>
    </div>
  );
}
