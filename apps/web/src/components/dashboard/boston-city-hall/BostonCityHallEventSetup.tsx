"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { LogoUploadWithName } from "@/components/dashboard/LogoUploadWithName";
import { BchSection } from "@/components/dashboard/boston-city-hall/BchSection";
import { BostonCityHallTicketing } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketing";
import {
  bchEventSetupPathWithBooking,
  bchPublicEventPath,
  slugifyEventName,
} from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import type { EventTicketingDetail, VenueOperationDetail } from "@/types/boston-city-hall";
import {
  EVENT_STATUS_LABEL,
  EVENT_TICKETING_SALES_STATUS_LABEL,
  formatTicketingMoney,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type SetupStep = "info" | "ticketing" | "review";

const STEPS: { id: SetupStep; label: string }[] = [
  { id: "info", label: "Informações" },
  { id: "ticketing", label: "Ingressos" },
  { id: "review", label: "Revisão" },
];

type EventForm = {
  id: string;
  slug: string;
  initialSlug: string;
  name: string;
  description: string;
  category: string;
  startLocal: string;
  endLocal: string;
  logoUrl: string;
  status: string;
  tenantId: string | null;
  organizer: string;
};

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}


function stepIndex(step: SetupStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

function ticketingReadiness(detail: EventTicketingDetail | null): {
  ok: boolean;
  items: { label: string; ok: boolean; hint?: string }[];
} {
  if (!detail) {
    return { ok: false, items: [{ label: "Carregar ingressos", ok: false }] };
  }
  const items: { label: string; ok: boolean; hint?: string }[] = [];
  if (!detail.ticketingEnabled) {
    items.push({
      label: "Ingressos desabilitados (evento sem venda)",
      ok: true,
      hint: "Habilite na etapa Ingressos se for vender.",
    });
    return { ok: true, items };
  }
  const hasTypes = detail.types.length > 0;
  items.push({
    label: "Pelo menos um tipo de ingresso",
    ok: hasTypes,
  });
  const activeTypes = detail.types.filter((t) => t.active);
  items.push({
    label: "Tipo ativo configurado",
    ok: activeTypes.length > 0,
  });
  const capacityOk = !detail.capacityHint?.exceedsVenueCapacity;
  items.push({
    label: "Capacidade dentro do venue",
    ok: capacityOk,
    hint: detail.capacityHint?.message ?? undefined,
  });
  return { ok: items.every((i) => i.ok), items };
}

export function BostonCityHallEventSetup({
  eventId,
  bookingId,
  backHref,
  backLabel,
  embedded,
}: {
  eventId: string;
  bookingId?: string | null;
  backHref?: string;
  backLabel?: string;
  embedded?: boolean;
}) {
  const [step, setStep] = useState<SetupStep>("info");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [ticketing, setTicketing] = useState<EventTicketingDetail | null>(null);
  const [venueLabel, setVenueLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const resolvedBackHref = backHref ?? `${BCH_BASE}/ticketing`;
  const resolvedBackLabel = backLabel ?? "Voltar";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [evRes, tickRes] = await Promise.all([
        api.get<{
          id: string;
          slug: string;
          name: string;
          description: string | null;
          category: string;
          startDate: string | null;
          endDate: string | null;
          startAt?: string | null;
          endAt?: string | null;
          logoUrl: string | null;
          status: string;
          tenantId: string | null;
          organizer: string;
        }>(`/events/${eventId}`),
        api.get<EventTicketingDetail>(`/boston-city-hall/ticketing/events/${eventId}`),
      ]);
      const ev = evRes.data;
      setEventForm({
        id: ev.id,
        slug: ev.slug,
        initialSlug: ev.slug,
        name: ev.name,
        description: ev.description ?? "",
        category: ev.category,
        startLocal: isoToDatetimeLocal(ev.startAt ?? ev.startDate),
        endLocal: isoToDatetimeLocal(ev.endAt ?? ev.endDate),
        logoUrl: ev.logoUrl ?? "",
        status: ev.status,
        tenantId: ev.tenantId,
        organizer: ev.organizer,
      });
      setTicketing(tickRes.data);

      const resolvedBookingId = bookingId?.trim();
      if (resolvedBookingId) {
        try {
          const op = await api.get<VenueOperationDetail>(
            `/boston-city-hall/operations/${resolvedBookingId}`,
          );
          setVenueLabel(
            op.data.spaceName
              ? `Boston City Hall · ${op.data.spaceName}`
              : "Boston City Hall",
          );
        } catch {
          setVenueLabel(null);
        }
      } else {
        try {
          const op = await api.get<VenueOperationDetail | null>(
            `/boston-city-hall/operations/by-event/${encodeURIComponent(eventId)}`,
          );
          setVenueLabel(
            op.data?.spaceName
              ? `Boston City Hall · ${op.data.spaceName}`
              : op.data
                ? "Boston City Hall"
                : null,
          );
        } catch {
          setVenueLabel(null);
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
      setEventForm(null);
      setTicketing(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshTicketing = useCallback(async () => {
    try {
      const res = await api.get<EventTicketingDetail>(
        `/boston-city-hall/ticketing/events/${eventId}`,
      );
      setTicketing(res.data);
    } catch {
      /* ignore */
    }
  }, [eventId]);

  const patchEvent = async (statusOverride?: string) => {
    if (!eventForm) return false;
    setSaving(true);
    try {
      const autoSlug =
        !eventForm.slug ||
        eventForm.slug === slugifyEventName(eventForm.name) ||
        eventForm.slug === eventForm.initialSlug
          ? slugifyEventName(eventForm.name)
          : eventForm.slug;

      const { data: updated } = await api.patch<{
        slug: string;
        status: string;
        logoUrl: string | null;
      }>(`/events/${eventId}`, {
        name: eventForm.name.trim(),
        slug: autoSlug || undefined,
        description: eventForm.description.trim() || undefined,
        organizer: eventForm.organizer,
        tenantId: eventForm.organizer === "tenant" ? eventForm.tenantId : null,
        category: eventForm.category,
        fixtureCategory: null,
        startDate: datetimeLocalToIso(eventForm.startLocal) ?? undefined,
        endDate: datetimeLocalToIso(eventForm.endLocal) ?? undefined,
        logoUrl: eventForm.logoUrl || undefined,
        competitionFormat: null,
        status: statusOverride ?? eventForm.status,
      });
      setEventForm((prev) =>
        prev
          ? {
              ...prev,
              slug: updated.slug,
              initialSlug: updated.slug,
              status: updated.status,
              logoUrl: updated.logoUrl ?? prev.logoUrl,
            }
          : null,
      );
      return true;
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Falha ao salvar evento.",
        variant: "error",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const ok = await patchEvent("draft");
    if (ok) {
      setFeedback({
        open: true,
        title: "Rascunho salvo",
        message: "As informações do evento foram atualizadas.",
        variant: "success",
      });
    }
  };

  const publish = async () => {
    if (!eventForm?.name.trim()) {
      setFeedback({
        open: true,
        title: "Publicação",
        message: "Informe o nome do evento antes de publicar.",
        variant: "error",
      });
      setStep("info");
      return;
    }
    const ok = await patchEvent("published");
    if (ok) {
      setFeedback({
        open: true,
        title: "Evento publicado",
        message: "O evento está visível no portfolio público quando as regras de ingressos permitirem.",
        variant: "success",
      });
      await load();
    }
  };

  const readiness = useMemo(() => ticketingReadiness(ticketing), [ticketing]);

  const admissionLabel = useMemo(() => {
    if (!ticketing?.ticketingEnabled) return "Sem venda de ingressos";
    if (!ticketing.types.length) return "Ingressos habilitados — configure tipos";
    const prices = ticketing.types.flatMap((t) => {
      if (t.usesLots && t.lots.length) return t.lots.map((l) => Number.parseFloat(l.price));
      return [Number.parseFloat(t.price ?? "0")];
    });
    const allFree = prices.every((p) => !Number.isFinite(p) || p <= 0);
    return allFree ? "Entrada gratuita" : "Ingressos pagos";
  }, [ticketing]);

  const capacityDisplay = useMemo(() => {
    const hint = ticketing?.capacityHint;
    if (hint) {
      const parts: string[] = [];
      if (hint.configuredTotal > 0) parts.push(`${hint.configuredTotal} configurados`);
      if (hint.venueCapacitySeated != null) parts.push(`${hint.venueCapacitySeated} assentos`);
      if (hint.venueCapacityStanding != null) parts.push(`${hint.venueCapacityStanding} em pé`);
      return parts.join(" · ") || "—";
    }
    const total = ticketing?.types.reduce((acc, t) => acc + (t.capacity ?? 0), 0) ?? 0;
    return total > 0 ? `${total} (tipos)` : "—";
  }, [ticketing]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400/80" />
      </div>
    );
  }

  if (loadError || !eventForm) {
    return (
      <BchSection title="Não foi possível carregar">
        <p className="text-sm text-red-300">{loadError ?? "Evento não encontrado."}</p>
        {!embedded ? (
          <Button variant="outline" className="mt-3 min-h-[44px]" asChild>
            <Link href={resolvedBackHref}>{resolvedBackLabel}</Link>
          </Button>
        ) : null}
      </BchSection>
    );
  }

  const currentIdx = stepIndex(step);
  const publicPath = bchPublicEventPath(eventForm.slug);
  const isPublished = eventForm.status === "published";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!embedded ? (
          <Button variant="ghost" size="sm" className="min-h-[40px] text-slate-300" asChild>
            <Link href={resolvedBackHref}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {resolvedBackLabel}
            </Link>
          </Button>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-sky-400/80">
            Planejamento do evento
          </span>
        )}
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            isPublished
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/35 bg-amber-500/10 text-amber-100",
          )}
        >
          {EVENT_STATUS_LABEL[eventForm.status] ?? eventForm.status}
        </span>
      </div>

      <nav aria-label="Progresso" className="rounded-xl border border-slate-800/80 bg-[#0a0f1a]/80 p-3">
        <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {STEPS.map((s, i) => {
            const done = i < currentIdx;
            const active = s.id === step;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active && "bg-amber-500/15 ring-1 ring-amber-500/35",
                    !active && done && "text-emerald-200/90",
                    !active && !done && "text-slate-400 hover:bg-slate-800/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      active && "border-amber-400 text-amber-200",
                      done && !active && "border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
                      !done && !active && "border-slate-600 text-slate-400",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === "info" ? (
        <BchSection title="Informações do evento">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bch-ev-name">Nome do evento *</Label>
                <Input
                  id="bch-ev-name"
                  value={eventForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const nextSlug =
                      !eventForm.slug ||
                      eventForm.slug === slugifyEventName(eventForm.name) ||
                      eventForm.slug === eventForm.initialSlug
                        ? slugifyEventName(newName)
                        : eventForm.slug;
                    setEventForm({ ...eventForm, name: newName, slug: nextSlug });
                  }}
                  className="text-foreground"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Organizador</Label>
                <p className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200">
                  Boston City Hall
                </p>
              </div>
              <div className="space-y-2">
                <Label>Local / espaço</Label>
                <p className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200">
                  {venueLabel ?? "Boston City Hall"}
                  {bookingId ? (
                    <Link
                      href={`${BCH_BASE}/operacao/${encodeURIComponent(bookingId)}`}
                      className="ml-2 text-xs text-amber-400/90 hover:text-amber-300"
                    >
                      Ver reserva
                    </Link>
                  ) : null}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bch-ev-start">Início</Label>
                <Input
                  id="bch-ev-start"
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={eventForm.startLocal}
                  onChange={(e) => setEventForm({ ...eventForm, startLocal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bch-ev-end">Fim</Label>
                <Input
                  id="bch-ev-end"
                  type="datetime-local"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={eventForm.endLocal}
                  onChange={(e) => setEventForm({ ...eventForm, endLocal: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Capacidade (ingressos / venue)</Label>
                <p className="text-sm text-slate-300">{capacityDisplay}</p>
                {ticketing?.capacityHint?.message ? (
                  <p className="text-xs text-amber-200/90">{ticketing.capacityHint.message}</p>
                ) : null}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bch-ev-desc">Descrição</Label>
                <Textarea
                  id="bch-ev-desc"
                  rows={4}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>
            </div>
            <LogoUploadWithName
              value={eventForm.logoUrl}
              onChange={(url) => setEventForm({ ...eventForm, logoUrl: url })}
              scope={`event:${eventId}`}
              displayNameAuto={eventForm.name || "evento-bch"}
              sectionLabel="Imagem de capa"
              choosePlaceholder="Escolher capa"
              urlPlaceholder="URL da capa"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="min-h-[44px]"
              onClick={() => void saveDraft()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar rascunho
            </Button>
            <Button type="button" className="min-h-[44px] bg-amber-600 hover:bg-amber-500" onClick={() => setStep("ticketing")}>
              Continuar
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </BchSection>
      ) : null}

      {step === "ticketing" ? (
        <BchSection
          title="Ingressos"
          actionHref={`${BCH_BASE}/ticketing`}
          actionLabel="Hub completo"
        >
          <p className="mb-3 text-xs text-slate-400">{admissionLabel}</p>
          <BostonCityHallTicketing
            fixedEventId={eventId}
            embedded
            onDetailChange={setTicketing}
          />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setStep("info")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="button"
              className="min-h-[44px] bg-amber-600 hover:bg-amber-500"
              onClick={() => {
                void refreshTicketing();
                setStep("review");
              }}
            >
              Revisar publicação
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </BchSection>
      ) : null}

      {step === "review" ? (
        <BchSection title="Revisão e publicação">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-slate-800/80 bg-slate-950/40 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">Resumo</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Nome</dt>
                  <dd className="text-right text-slate-100">{eventForm.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Status</dt>
                  <dd>{EVENT_STATUS_LABEL[eventForm.status] ?? eventForm.status}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Ingressos</dt>
                  <dd>{admissionLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Capacidade</dt>
                  <dd className="text-right">{capacityDisplay}</dd>
                </div>
              </dl>
            </div>
            <div className="space-y-3 rounded-lg border border-slate-800/80 bg-slate-950/40 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">
                Prontidão de ingressos
              </h3>
              <ul className="space-y-2 text-sm">
                {readiness.items.map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        item.ok ? "text-emerald-400" : "text-slate-500",
                      )}
                    />
                    <span>
                      {item.label}
                      {item.hint ? (
                        <span className="mt-0.5 block text-xs text-slate-400">{item.hint}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {ticketing?.ticketingEnabled && ticketing.types.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-slate-800/80 pt-2 text-xs text-slate-300">
                  {ticketing.types.map((t) => (
                    <li key={t.id}>
                      {t.name} · {formatTicketingMoney(t.currentPrice, ticketing.currency)} ·{" "}
                      {EVENT_TICKETING_SALES_STATUS_LABEL[t.salesStatus]}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-800/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-100">Prévia pública</p>
              <p className="text-xs text-slate-400">
                {isPublished
                  ? "Página no portfolio BCH."
                  : "Publique para exibir no portfolio; rascunho não aparece na listagem pública."}
              </p>
            </div>
            <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
              <a href={publicPath} target="_blank" rel="noopener noreferrer">
                Abrir prévia
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setStep("ticketing")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Ajustar ingressos
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="min-h-[44px]"
              onClick={() => void saveDraft()}
            >
              Salvar rascunho
            </Button>
            <Button
              type="button"
              disabled={saving || (ticketing?.ticketingEnabled && !readiness.ok)}
              className="min-h-[44px] bg-amber-600 hover:bg-amber-500"
              onClick={() => void publish()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publicar evento
            </Button>
          </div>
          {ticketing?.ticketingEnabled && !readiness.ok ? (
            <p className="mt-2 text-xs text-amber-200/90">
              Corrija a configuração de ingressos antes de publicar com venda ativa.
            </p>
          ) : null}
        </BchSection>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}

export { bchEventSetupPathWithBooking };
