"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { FootballPositionSelect } from "@/components/dashboard/players/FootballPositionSelect";
import { CaptacaoRatingPicker } from "@/components/dashboard/futebol/CaptacaoRatingPicker";
import { CaptacaoProgressSteps } from "@/components/dashboard/futebol/CaptacaoProgressSteps";
import { api } from "@/lib/api";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import {
  CAPTACAO_FLOW_PATH_OPTIONS,
  CAPTACAO_MOBILE_STEPS,
  EMPTY_CAPTACAO_MOBILE_FORM,
  type CaptacaoMobileFormState,
  type CaptacaoMobileStepId,
} from "@/lib/captacao-mobile-flow";
import {
  SCOUTING_PRIORITIES,
  SCOUTING_SOURCES,
  type Scout,
} from "@/lib/captacao-types";
import { cn } from "@/lib/utils";

type Tenant = { id: string; name: string; categories?: string[] | null };

const STEP_ORDER = CAPTACAO_MOBILE_STEPS.map((s) => s.id);

const fieldInput =
  "min-h-[44px] text-base md:min-h-10 md:text-sm text-foreground [&::-webkit-datetime-edit]:text-foreground";
const formGrid2 = "grid gap-4 md:grid-cols-2";
const formGrid3 = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";
const spanFull = "md:col-span-2 lg:col-span-3";
const span2 = "md:col-span-2";

function nextStep(current: CaptacaoMobileStepId): CaptacaoMobileStepId {
  const i = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)] ?? current;
}

function prevStep(current: CaptacaoMobileStepId): CaptacaoMobileStepId {
  const i = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.max(i - 1, 0)] ?? current;
}

export function CaptacaoMobileWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get("tenantId") ?? "";
  const { categories: allCats } = useFixtureCategories();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [step, setStep] = useState<CaptacaoMobileStepId>("cadastro");
  const [form, setForm] = useState<CaptacaoMobileFormState>({
    ...EMPTY_CAPTACAO_MOBILE_FORM,
    tenantId: initialTenantId,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "warning" | "error";
  }>({ open: false, title: "", message: "", variant: "info" });

  const selectedTenant = tenants.find((t) => t.id === form.tenantId);
  const categoriesForClub = useMemo(
    () => filterCategoriesForTenant(allCats, selectedTenant?.categories),
    [allCats, selectedTenant?.categories],
  );

  const patch = useCallback((p: Partial<CaptacaoMobileFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    if (!form.tenantId) {
      setScouts([]);
      return;
    }
    api
      .get<Scout[]>(`/captacao/scouts?tenantId=${form.tenantId}&active=true`)
      .then(({ data }) => setScouts(Array.isArray(data) ? data : []))
      .catch(() => setScouts([]));
  }, [form.tenantId]);

  const whatsappGuardianUrl = form.guardianPhone.trim()
    ? buildWhatsAppUrl(form.guardianPhone.trim(), `Olá ${form.guardianName || ""}, sobre a captação do atleta ${form.name}.`)
    : null;

  function validateStep(): string | null {
    switch (step) {
      case "cadastro":
        if (!form.tenantId) return "Selecione o clube.";
        if (!form.name.trim()) return "Informe o nome completo.";
        if (!form.birthDate) return "Informe a data de nascimento.";
        if (!form.position) return "Informe a posição.";
        return null;
      case "responsavel":
        if (!form.guardianName.trim()) return "Informe o nome do responsável.";
        if (!form.guardianPhone.trim()) return "Informe o celular do responsável.";
        return null;
      case "contexto":
        if (!form.sourceDetails.trim() && form.source === "outro") {
          return "Descreva onde/como observou o atleta.";
        }
        return null;
      case "avaliacao":
        if (
          form.technicalRating == null ||
          form.tacticalRating == null ||
          form.physicalRating == null ||
          form.cognitiveRating == null
        ) {
          return "Toque nas notas de 0 a 5 em todas as dimensões.";
        }
        return null;
      case "fluxo":
        if (form.flowPath === "tryout" && !form.proposedCtDate) {
          return "Informe a data proposta para o CT.";
        }
        if (form.flowPath === "integracao_direta" && !form.descriptiveObservation.trim()) {
          return "Descreva a avaliação técnica para integração direta.";
        }
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const err = validateStep();
    if (err) {
      setFeedback({ open: true, title: "Campos obrigatórios", message: err, variant: "warning" });
      return;
    }
    setStep(nextStep(step));
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) {
      setFeedback({ open: true, title: "Campos obrigatórios", message: err, variant: "warning" });
      return;
    }
    if (!form.scoutId) {
      setFeedback({
        open: true,
        title: "Captador",
        message: "Selecione o captador responsável.",
        variant: "warning",
      });
      setStep("cadastro");
      return;
    }

    setSaving(true);
    try {
      const overall =
        ((form.technicalRating ?? 0) +
          (form.tacticalRating ?? 0) +
          (form.physicalRating ?? 0) +
          (form.cognitiveRating ?? 0)) /
        4;

      const proposedCtAt =
        form.flowPath === "tryout" && form.proposedCtDate
          ? `${form.proposedCtDate}T${form.proposedCtTime || "09:00"}:00.000Z`
          : undefined;

      const evaluationOutcome =
        form.flowPath === "integracao_direta" ? "aprovado" : "para_teste";

      const { data: prospect } = await api.post<{ id: string }>("/captacao/prospects", {
        tenantId: form.tenantId,
        scoutId: form.scoutId,
        name: form.name.trim(),
        birthDate: form.birthDate,
        position: form.position,
        targetCategory: form.targetCategory || undefined,
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        guardianEmail: form.guardianEmail.trim() || undefined,
        guardianAddress: form.guardianAddress.trim() || undefined,
        source: form.source,
        sourceDetails: form.sourceDetails.trim() || undefined,
        currentClub: form.currentClub.trim() || undefined,
        agentName: form.agentName.trim() || undefined,
        agentPhone: form.agentPhone.trim() || undefined,
        priority: form.priority,
        needsLodging: form.needsLodging === "sim",
        technicalRating: form.technicalRating,
        tacticalRating: form.tacticalRating,
        physicalRating: form.physicalRating,
        cognitiveRating: form.cognitiveRating,
        descriptiveObservation: form.descriptiveObservation.trim() || undefined,
        flowPath: form.flowPath,
        evaluationOutcome,
        proposedCtAt,
        stage: form.flowPath === "integracao_direta" ? "prioridade" : "tryout",
      });

      const { data: reportResult } = await api.post<{
        schedulerNotification?: { whatsappUrl?: string | null };
      }>("/captacao/reports", {
        tenantId: form.tenantId,
        prospectId: prospect.id,
        scoutId: form.scoutId,
        recommendation: form.flowPath === "integracao_direta" ? "contratar" : "continuar",
        evaluationOutcome,
        overallRating: overall,
        technicalRating: form.technicalRating,
        tacticalRating: form.tacticalRating,
        physicalRating: form.physicalRating,
        cognitiveRating: form.cognitiveRating,
        scoutNotes: form.descriptiveObservation.trim() || undefined,
        observationType: "ao_vivo",
      });

      if (
        form.flowPath === "tryout" &&
        reportResult?.schedulerNotification?.whatsappUrl
      ) {
        window.open(reportResult.schedulerNotification.whatsappUrl, "_blank", "noopener,noreferrer");
      }

      if (form.flowPath === "tryout" && proposedCtAt) {
        await api.patch(`/captacao/prospects/${prospect.id}/propose-ct`, {
          proposedCtAt,
        });
      }

      setFeedback({
        open: true,
        title: "Prospect registrado",
        message:
          form.flowPath === "integracao_direta"
            ? "Enviado ao gerente de futebol para decisão."
            : "Data de CT proposta — aguardando supervisor.",
        variant: "success",
      });
      router.push(
        `/dashboard/futebol/captacao/prospects/${prospect.id}?tenantId=${form.tenantId}`,
      );
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background lg:min-h-0">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-6 lg:px-8">
          <div className="mb-3 flex items-center gap-2 md:mb-4">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] shrink-0" asChild>
              <Link href={`/dashboard/futebol/captacao${form.tenantId ? `?tenantId=${form.tenantId}` : ""}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-tight md:text-xl">Novo prospect</h1>
              <p className="text-xs text-muted-foreground md:text-sm">Captação · fluxo guiado</p>
            </div>
          </div>
          <CaptacaoProgressSteps currentStep={step} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 md:px-6 md:py-6 lg:px-8 lg:pb-8">
        <div className="mx-auto w-full max-w-6xl">
          <Card>
            <CardContent className="p-4 md:p-6">
        {step === "cadastro" ? (
          <div className={formGrid3}>
            <div className={cn("grid gap-2", spanFull)}>
              <Label>Clube *</Label>
              <NativeSelect
                className="min-h-[44px] md:min-h-10"
                value={form.tenantId}
                onChange={(e) => patch({ tenantId: e.target.value })}
              >
                <option value="">Selecione…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className={cn("grid gap-2", spanFull)}>
              <Label>Captador *</Label>
              <NativeSelect
                className="min-h-[44px] md:min-h-10"
                value={form.scoutId}
                onChange={(e) => patch({ scoutId: e.target.value })}
                disabled={!form.tenantId}
              >
                <option value="">Selecione…</option>
                {scouts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label>Nome completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Nome do atleta"
                className={fieldInput}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data de nascimento *</Label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => patch({ birthDate: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div className="grid gap-2">
              <Label>Posição *</Label>
              <FootballPositionSelect
                value={form.position}
                onValueChange={(v) => patch({ position: v })}
                triggerClassName="min-h-[44px] w-full md:min-h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label>Categoria alvo</Label>
              <NativeSelect
                className="min-h-[44px] md:min-h-10"
                value={form.targetCategory}
                onChange={(e) => patch({ targetCategory: e.target.value })}
              >
                <option value="">—</option>
                {categoriesForClub.map((c) => (
                  <option key={c.value} value={c.value}>
                    {getCategoryLabel(c.value, "pt")}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        ) : null}

        {step === "responsavel" ? (
          <div className={formGrid2}>
            <div className="grid gap-2">
              <Label>Responsável *</Label>
              <Input
                value={form.guardianName}
                onChange={(e) => patch({ guardianName: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div className="grid gap-2">
              <Label>Celular *</Label>
              <Input
                type="tel"
                inputMode="tel"
                value={form.guardianPhone}
                onChange={(e) => patch({ guardianPhone: e.target.value })}
                placeholder="(00) 00000-0000"
                className={fieldInput}
              />
            </div>
            {whatsappGuardianUrl ? (
              <div className={span2}>
                <Button variant="outline" className="min-h-[44px] w-full sm:w-auto md:min-h-10" asChild>
                  <a href={whatsappGuardianUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp responsável
                  </a>
                </Button>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                inputMode="email"
                value={form.guardianEmail}
                onChange={(e) => patch({ guardianEmail: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div className={cn("grid gap-2", span2)}>
              <Label>Endereço</Label>
              <Textarea
                value={form.guardianAddress}
                onChange={(e) => patch({ guardianAddress: e.target.value })}
                rows={3}
                className="text-base md:text-sm"
              />
            </div>
          </div>
        ) : null}

        {step === "contexto" ? (
          <div className={formGrid3}>
            <div className={cn("grid gap-2", spanFull)}>
              <Label>Onde / como observou *</Label>
              <NativeSelect
                className="min-h-[44px] md:min-h-10"
                value={form.source}
                onChange={(e) => patch({ source: e.target.value })}
              >
                {SCOUTING_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className={cn("grid gap-2", spanFull)}>
              <Label>Detalhes</Label>
              <Textarea
                value={form.sourceDetails}
                onChange={(e) => patch({ sourceDetails: e.target.value })}
                placeholder="Campeonato, cidade, indicação…"
                rows={3}
                className="text-base md:text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label>Clube atual</Label>
              <Input
                value={form.currentClub}
                onChange={(e) => patch({ currentClub: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div className="grid gap-2">
              <Label>Agente / vínculo</Label>
              <Input
                value={form.agentName}
                onChange={(e) => patch({ agentName: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div className="grid gap-2">
              <Label>Contato agente</Label>
              <Input
                type="tel"
                value={form.agentPhone}
                onChange={(e) => patch({ agentPhone: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div className="grid gap-2">
              <Label>Prioridade</Label>
              <NativeSelect
                className="min-h-[44px] md:min-h-10"
                value={form.priority}
                onChange={(e) => patch({ priority: e.target.value })}
              >
                {SCOUTING_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Precisa alojamento?</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["sim", "nao"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch({ needsLodging: v })}
                    className={cn(
                      "min-h-[44px] rounded-lg border text-sm font-medium md:min-h-10",
                      form.needsLodging === v
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground",
                    )}
                  >
                    {v === "sim" ? "Sim" : "Não"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === "avaliacao" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground md:col-span-2">
              Selecione a nota de 0 a 5 em cada dimensão.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <CaptacaoRatingPicker
                label="Técnico"
                value={form.technicalRating}
                onChange={(v) => patch({ technicalRating: v })}
              />
              <CaptacaoRatingPicker
                label="Tático"
                value={form.tacticalRating}
                onChange={(v) => patch({ tacticalRating: v })}
              />
              <CaptacaoRatingPicker
                label="Físico"
                value={form.physicalRating}
                onChange={(v) => patch({ physicalRating: v })}
              />
              <CaptacaoRatingPicker
                label="Cognitivo"
                value={form.cognitiveRating}
                onChange={(v) => patch({ cognitiveRating: v })}
              />
            </div>
          </div>
        ) : null}

        {step === "fluxo" ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">Como encaminhar?</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {CAPTACAO_FLOW_PATH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patch({ flowPath: opt.value })}
                  className={cn(
                    "min-h-[44px] rounded-xl border p-4 text-left transition-colors md:min-h-0",
                    form.flowPath === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/10",
                  )}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>
            {form.flowPath === "tryout" ? (
              <div className={formGrid2}>
                <div className="grid gap-2">
                  <Label>Data proposta CT *</Label>
                  <Input
                    type="date"
                    value={form.proposedCtDate}
                    onChange={(e) => patch({ proposedCtDate: e.target.value })}
                    className={fieldInput}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={form.proposedCtTime}
                    onChange={(e) => patch({ proposedCtTime: e.target.value })}
                    className={fieldInput}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Avaliação técnica detalhada *</Label>
                <Textarea
                  value={form.descriptiveObservation}
                  onChange={(e) => patch({ descriptiveObservation: e.target.value })}
                  rows={5}
                  placeholder="Pontos fortes, riscos, recomendação…"
                  className="text-base md:text-sm"
                />
              </div>
            )}
          </div>
        ) : null}

        {step === "resumo" ? (
          <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
            <SummaryRow label="Atleta" value={form.name} />
            <SummaryRow label="Posição" value={form.position} />
            <SummaryRow label="Responsável" value={form.guardianName} />
            <SummaryRow
              label="Contato"
              value={
                form.guardianPhone ? (
                  <a href={`tel:${form.guardianPhone}`} className="inline-flex items-center gap-1 text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    {form.guardianPhone}
                  </a>
                ) : undefined
              }
            />
            <SummaryRow
              label="Notas"
              value={`T ${form.technicalRating} · Ta ${form.tacticalRating} · F ${form.physicalRating} · C ${form.cognitiveRating}`}
            />
            <SummaryRow
              label="Fluxo"
              value={
                form.flowPath === "integracao_direta" ? "Integração direta → Gerente" : "Try-out CT → Supervisor"
              }
            />
          </div>
        ) : null}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur lg:static lg:bg-background">
        <div className="mx-auto flex w-full max-w-6xl gap-2 px-4 py-3 md:px-6 lg:justify-end lg:gap-3 lg:px-8">
          {step !== "cadastro" ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] flex-1 lg:min-h-10 lg:min-w-[140px] lg:flex-none"
              onClick={() => setStep(prevStep(step))}
              disabled={saving}
            >
              Voltar
            </Button>
          ) : null}
          {step !== "resumo" ? (
            <Button
              type="button"
              className="min-h-[48px] flex-1 lg:min-h-10 lg:min-w-[160px] lg:flex-none"
              onClick={handleNext}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              className="min-h-[48px] flex-1 lg:min-h-10 lg:min-w-[180px] lg:flex-none"
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar prospect
            </Button>
          )}
        </div>
      </footer>

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

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-lg border border-border/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
