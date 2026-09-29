"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { DashboardFilterBar, FilterBarField } from "@/components/dashboard/cup360/DashboardFilterBar";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  TRYOUT_REFERRAL_SOURCES,
  TRYOUT_WORKFLOW_STAGES,
  TRYOUT_REG_STATUSES,
  TRYOUT_FEDERATION_STATUSES,
  type TryoutHubItem,
  type TryoutHubResponse,
  type TryoutReporting,
  labelTryoutSource,
  labelTryoutStage,
  tryoutStageBadgeClass,
} from "@/lib/tryout-workflow-types";
import { CaptacaoManagerDecisionPanel } from "./CaptacaoManagerDecisionPanel";
import type { ScoutingProspect } from "@/lib/captacao-types";

type Tenant = { id: string; name: string };

type Props = {
  tenants: Tenant[];
  initialTenantId: string;
};

export function TryOutHub({ tenants, initialTenantId }: Props) {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [stageFilter, setStageFilter] = useState("");
  const [hub, setHub] = useState<TryoutHubResponse | null>(null);
  const [reporting, setReporting] = useState<TryoutReporting | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TryoutHubItem | null>(null);
  const [supervisionNotes, setSupervisionNotes] = useState("");
  const [arrivalSource, setArrivalSource] = useState("");
  const [coachForm, setCoachForm] = useState({
    staffName: "",
    technicalRating: "3",
    physicalRating: "3",
    tacticalRating: "3",
    cognitiveRating: "3",
    descriptiveObservation: "",
    outcome: "aprovado" as "aprovado" | "reprovado",
  });
  const [regForm, setRegForm] = useState({
    tryoutRegDocumentation: "pendente",
    tryoutRegCbf: "pendente",
    tryoutRegFederation: "na",
    tryoutRegBid: "pendente",
  });
  const [detailProspect, setDetailProspect] = useState<ScoutingProspect | null>(null);
  const [dialog, setDialog] = useState<
    "supervision" | "arrival" | "coach" | "registration" | "manager" | null
  >(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const q = stageFilter ? `&stage=${encodeURIComponent(stageFilter)}` : "";
      const [{ data: hubData }, { data: rep }] = await Promise.all([
        api.get<TryoutHubResponse>(`/tryout-workflow/hub?tenantId=${tenantId}${q}`),
        api.get<TryoutReporting>(`/tryout-workflow/reporting?tenantId=${tenantId}`),
      ]);
      setHub(hubData);
      setReporting(rep);
    } catch {
      setHub(null);
      setReporting(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, stageFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const by = hub?.byStage ?? {};
    return [
      { label: "Supervisão", value: by.aguardando_supervisao ?? 0 },
      { label: "Fisioterapia", value: by.aguardando_fisio ?? 0 },
      { label: "Campo", value: (by.liberado_campo ?? 0) + (by.em_avaliacao_campo ?? 0) },
      { label: "Treinador", value: by.aguardando_treinador ?? 0 },
      { label: "Gerência", value: by.aguardando_gerencia ?? 0 },
    ];
  }, [hub?.byStage]);

  async function openManager(item: TryoutHubItem) {
    const { data } = await api.get<ScoutingProspect>(`/captacao/prospects/${item.id}`);
    setDetailProspect(data);
    setActive(item);
    setDialog("manager");
  }

  async function post(path: string, body?: Record<string, unknown>) {
    await api.post(path, body ?? {});
    await load();
    setDialog(null);
    setActive(null);
  }

  return (
    <Cup360PageShell>
      <DashboardFilterBar>
        <FilterBarField label="Clube">
          <NativeSelectField
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="Selecione…"
            options={tenants.map((t) => ({ value: t.id, label: t.name }))}
          />
        </FilterBarField>
        <FilterBarField label="Etapa">
          <NativeSelectField
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            placeholder="Todas"
            options={[
              { value: "", label: "Todas" },
              ...TRYOUT_WORKFLOW_STAGES.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
        </FilterBarField>
        <FilterBarField label=" ">
          <Button type="button" variant="outline" className="h-10 w-full sm:w-auto" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </FilterBarField>
      </DashboardFilterBar>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

      {reporting ? (
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-zinc-950/60 p-3">
            <div className="text-xs text-muted-foreground">Em avaliação</div>
            <div className="text-xl font-semibold tabular-nums">{reporting.underEvaluation}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-zinc-950/60 p-3">
            <div className="text-xs text-muted-foreground">Aprovados</div>
            <div className="text-xl font-semibold tabular-nums">{reporting.approved}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-zinc-950/60 p-3">
            <div className="text-xs text-muted-foreground">Duração média (dias)</div>
            <div className="text-xl font-semibold tabular-nums">
              {reporting.averageEvaluationDurationDays ?? "—"}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-zinc-950/60 p-3">
            <div className="text-xs text-muted-foreground">Renovações semanais</div>
            <div className="text-xl font-semibold tabular-nums">{reporting.totalWeeklyRenewals}</div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Bloqueio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(hub?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum candidato no fluxo Try Out.
                  </TableCell>
                </TableRow>
              ) : (
                hub?.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/futebol/captacao/prospects/${p.id}?tenantId=${tenantId}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{labelTryoutSource(p.arrivalReferralSource)}</TableCell>
                    <TableCell className="text-xs">{p.targetCategory ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded border px-2 py-0.5 text-xs ${tryoutStageBadgeClass(p.tryoutEffectiveStage)}`}
                      >
                        {labelTryoutStage(p.tryoutEffectiveStage)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.tryoutPeriodStartedAt
                        ? formatDateDayMonYear(new Date(p.tryoutPeriodStartedAt))
                        : "—"}
                      {p.tryoutPeriodEndsAt ? (
                        <>
                          {" → "}
                          {formatDateDayMonYear(new Date(p.tryoutPeriodEndsAt))}
                        </>
                      ) : null}
                      {(p.tryoutRenewalCount ?? 0) > 0 ? (
                        <span className="ml-1 text-muted-foreground">· {p.tryoutRenewalCount} renov.</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-amber-300/90">
                      {p.tryoutBlockReason ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {p.tryoutEffectiveStage === "aguardando_supervisao" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => {
                                setActive(p);
                                setArrivalSource(p.arrivalReferralSource ?? "captacao");
                                setDialog("arrival");
                              }}
                            >
                              Origem
                            </Button>
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setActive(p);
                                setDialog("supervision");
                              }}
                            >
                              Validar
                            </Button>
                          </>
                        ) : null}
                        {p.tryoutEffectiveStage === "aguardando_fisio" ? (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href="/dashboard/saude/fisioterapia/liberacao-tryout">Fisioterapia</Link>
                          </Button>
                        ) : null}
                        {(p.tryoutEffectiveStage === "liberado_campo" ||
                          p.tryoutEffectiveStage === "em_avaliacao_campo") && (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={`/dashboard/futebol/captacao?tenantId=${tenantId}`}>Fila CT</Link>
                          </Button>
                        )}
                        {p.tryoutEffectiveStage === "aguardando_treinador" ? (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setActive(p);
                              setDialog("coach");
                            }}
                          >
                            Avaliar
                          </Button>
                        ) : null}
                        {p.tryoutEffectiveStage === "aguardando_gerencia" ? (
                          <Button size="sm" className="h-8" onClick={() => void openManager(p)}>
                            Gerência
                          </Button>
                        ) : null}
                        {p.tryoutEffectiveStage === "aprovado_documentacao" ? (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setActive(p);
                              setDialog("registration");
                            }}
                          >
                            CBF / BID
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            void api
                              .post(`/tryout-workflow/prospects/${p.id}/renew-period`, {})
                              .then(() => load())
                              .catch(() =>
                                setFeedback({
                                  open: true,
                                  title: "Erro",
                                  message: "Não foi possível renovar o período.",
                                  variant: "error",
                                }),
                              )
                          }
                        >
                          +1 sem.
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialog === "arrival"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Origem de chegada</DialogTitle>
          </DialogHeader>
          {active ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void post(`/tryout-workflow/prospects/${active.id}/arrival`, {
                  arrivalReferralSource: arrivalSource,
                });
              }}
            >
              <Label>Origem</Label>
              <NativeSelectField
                value={arrivalSource}
                onChange={(e) => setArrivalSource(e.target.value)}
                options={TRYOUT_REFERRAL_SOURCES.map((s) => ({ value: s.value, label: s.label }))}
              />
              <Button type="submit">Salvar</Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "supervision"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar chegada / documentação</DialogTitle>
          </DialogHeader>
          {active ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void post(`/tryout-workflow/prospects/${active.id}/supervision/validate`, {
                  notes: supervisionNotes.trim() || undefined,
                });
              }}
            >
              <Textarea
                className="text-foreground"
                value={supervisionNotes}
                onChange={(e) => setSupervisionNotes(e.target.value)}
                placeholder="Observações da supervisão (opcional)"
              />
              <Button type="submit">Confirmar documentação</Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "coach"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliação do treinador (campo)</DialogTitle>
          </DialogHeader>
          {active ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!coachForm.descriptiveObservation.trim()) {
                  setFeedback({
                    open: true,
                    title: "Observação obrigatória",
                    message: "Descreva a avaliação do atleta.",
                    variant: "warning",
                  });
                  return;
                }
                void post(`/tryout-workflow/prospects/${active.id}/coach-evaluation`, {
                  staffName: coachForm.staffName.trim() || undefined,
                  technicalRating: Number(coachForm.technicalRating),
                  physicalRating: Number(coachForm.physicalRating),
                  tacticalRating: Number(coachForm.tacticalRating),
                  cognitiveRating: Number(coachForm.cognitiveRating),
                  descriptiveObservation: coachForm.descriptiveObservation.trim(),
                  outcome: coachForm.outcome,
                });
              }}
            >
              <div>
                <Label>Treinador</Label>
                <Input
                  value={coachForm.staffName}
                  onChange={(e) => setCoachForm((f) => ({ ...f, staffName: e.target.value }))}
                />
              </div>
              {(["technicalRating", "physicalRating", "tacticalRating", "cognitiveRating"] as const).map(
                (key) => (
                  <div key={key}>
                    <Label>
                      {key === "technicalRating"
                        ? "Técnico (0–5)"
                        : key === "physicalRating"
                          ? "Físico (0–5)"
                          : key === "tacticalRating"
                            ? "Tático (0–5)"
                            : "Cognitivo (0–5)"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.5}
                      className="text-foreground"
                      value={coachForm[key]}
                      onChange={(e) => setCoachForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ),
              )}
              <div>
                <Label>Observação descritiva *</Label>
                <Textarea
                  required
                  className="text-foreground"
                  value={coachForm.descriptiveObservation}
                  onChange={(e) =>
                    setCoachForm((f) => ({ ...f, descriptiveObservation: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Decisão</Label>
                <NativeSelect
                  value={coachForm.outcome}
                  onChange={(e) =>
                    setCoachForm((f) => ({
                      ...f,
                      outcome: e.target.value as "aprovado" | "reprovado",
                    }))
                  }
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                </NativeSelect>
              </div>
              <Button type="submit">Registrar avaliação</Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "registration"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro — documentação / CBF / BID</DialogTitle>
          </DialogHeader>
          {active ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void api
                  .patch(`/tryout-workflow/prospects/${active.id}/registration`, regForm)
                  .then(() => load())
                  .then(() => setDialog(null))
                  .catch(() =>
                    setFeedback({
                      open: true,
                      title: "Erro",
                      message: "Não foi possível atualizar o registro.",
                      variant: "error",
                    }),
                  );
              }}
            >
              <div>
                <Label>Documentação</Label>
                <NativeSelectField
                  value={regForm.tryoutRegDocumentation}
                  onChange={(e) => setRegForm((f) => ({ ...f, tryoutRegDocumentation: e.target.value }))}
                  options={TRYOUT_REG_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
              <div>
                <Label>CBF</Label>
                <NativeSelectField
                  value={regForm.tryoutRegCbf}
                  onChange={(e) => setRegForm((f) => ({ ...f, tryoutRegCbf: e.target.value }))}
                  options={TRYOUT_REG_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
              <div>
                <Label>Federação / transferência</Label>
                <NativeSelectField
                  value={regForm.tryoutRegFederation}
                  onChange={(e) => setRegForm((f) => ({ ...f, tryoutRegFederation: e.target.value }))}
                  options={TRYOUT_FEDERATION_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
              <div>
                <Label>BID</Label>
                <NativeSelectField
                  value={regForm.tryoutRegBid}
                  onChange={(e) => setRegForm((f) => ({ ...f, tryoutRegBid: e.target.value }))}
                  options={TRYOUT_REG_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
              <Button type="submit">Salvar status</Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "manager"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decisão da gerência</DialogTitle>
          </DialogHeader>
          {detailProspect ? (
            <CaptacaoManagerDecisionPanel
              prospect={detailProspect}
              onUpdated={() => {
                void load();
                setDialog(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </Cup360PageShell>
  );
}
