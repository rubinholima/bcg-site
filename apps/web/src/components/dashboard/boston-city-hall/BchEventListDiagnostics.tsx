"use client";

import Link from "next/link";
import { Inbox, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BCH_BTN_PRIMARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { cn } from "@/lib/utils";

export function BchEventListDiagnostics({
  loading,
  error,
  eventCount,
  onRetry,
  onCreateEvent,
  compact,
}: {
  loading?: boolean;
  error: string | null;
  eventCount: number;
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
            <p className="text-xs text-red-200/70">Verifique sua conexão e tente novamente.</p>
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

  if (eventCount > 0) return null;

  return (
    <BchEmptyState
      icon={Inbox}
      message="Nenhum evento cadastrado no Boston City Hall. Crie um rascunho ou confirme uma reserva para gerar o evento."
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
