"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { isFootballKind } from "@/lib/home-data";
import {
  TRYOUT_CLEARANCE_TESTS,
  TRYOUT_CLEARANCE_TEST_LABELS,
  emptyTryoutBilateralTests,
  isPhysioTryoutClearanceFormComplete,
  isTryoutBilateralSideInvalid,
  validatePhysioTryoutClearanceForm,
  type TryoutBilateralTests,
} from "@/lib/physio-tryout-labels";
import { cn } from "@/lib/utils";

type Tenant = { id: string; name: string; kind?: { name?: string } };
type StaffOpt = { id: string; name: string };

type TryoutProspectOption = {
  id: string;
  name: string;
  targetCategory?: string | null;
  stage?: string;
};

export default function PhysioTryoutClearancePage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [prospects, setProspects] = useState<TryoutProspectOption[]>([]);
  const [prospectId, setProspectId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [injuryHistory, setInjuryHistory] = useState("");
  const [bilateralTests, setBilateralTests] = useState<TryoutBilateralTests>(emptyTryoutBilateralTests());
  const [manualStrengthTest, setManualStrengthTest] = useState("");
  const [observations, setObservations] = useState("");
  const [outcome, setOutcome] = useState<"aprovado" | "reprovado" | "">("");
  const [evaluatedAt, setEvaluatedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationBanner, setValidationBanner] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({
    open: false,
    title: "",
    message: "",
    variant: "info" as "info" | "success" | "warning" | "error",
  });

  const selectedStaff = staffList.find((s) => s.id === staffId);
  const selectedProspect = prospects.find((p) => p.id === prospectId);

  const formPayload = {
    tenantId,
    prospectId,
    staffId,
    staffName: selectedStaff?.name,
    injuryHistory,
    manualStrengthTest,
    outcome,
    bilateralTests,
  };

  const formComplete = isPhysioTryoutClearanceFormComplete(formPayload);

  const fieldHighlight = (invalid: boolean) =>
    invalid && showValidationErrors
      ? "border-red-500/70 ring-1 ring-red-500/40"
      : "";

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants((Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setStaffList([]);
      return;
    }
    api
      .get<StaffOpt[]>(`/medical-staff?tenantId=${encodeURIComponent(tenantId)}&role=fisioterapeuta`)
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => setStaffList([]));
  }, [tenantId]);

  const loadProspects = useCallback(async () => {
    if (!tenantId) {
      setProspects([]);
      return;
    }
    setLoadingProspects(true);
    try {
      const { data } = await api.get<TryoutProspectOption[]>(
        `/fisioterapia/tryout-clearances/tryout-prospects?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setProspects(Array.isArray(data) ? data : []);
    } catch {
      setProspects([]);
    } finally {
      setLoadingProspects(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadProspects();
  }, [loadProspects]);

  const updateSide = (
    testKey: (typeof TRYOUT_CLEARANCE_TESTS)[number],
    side: "right" | "left",
    field: "response" | "outcome",
    value: string,
  ) => {
    setBilateralTests((prev) => ({
      ...prev,
      [testKey]: {
        ...prev[testKey],
        [side]: {
          ...prev[testKey][side],
          [field]: field === "outcome" && !value ? undefined : value,
        },
      },
    }));
    setValidationBanner(null);
  };

  function runClientValidation(): boolean {
    const issues = validatePhysioTryoutClearanceForm(formPayload);
    if (issues.length === 0) {
      setShowValidationErrors(false);
      setValidationBanner(null);
      return true;
    }
    setShowValidationErrors(true);
    const bilateralCount = issues.filter((i) => i.focusId.startsWith("tryout-test-")).length;
    const header =
      bilateralCount > 0
        ? `Complete os 10 testes bilaterais (resposta e resultado em D e E). ${issues.length} pendência(s).`
        : `Corrija ${issues.length} campo(s) obrigatório(s) antes de salvar.`;
    setValidationBanner(`${header} ${issues[0]?.message ?? ""}`);
    const firstId = issues[0]?.focusId;
    if (firstId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstId);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLElement && "focus" in el) {
          el.focus({ preventScroll: true });
        }
      });
    }
    setFeedback({
      open: true,
      title: "Formulário incompleto",
      message: issues.slice(0, 5).map((i) => i.message).join("\n"),
      variant: "warning",
    });
    return false;
  }

  const handleSave = async () => {
    if (!runClientValidation()) return;
    setSaving(true);
    try {
      const { data } = await api.post<{ emailNotification?: { sent?: boolean; error?: string } }>(
        "/fisioterapia/tryout-clearances",
        {
          tenantId,
          prospectId,
          staffId: staffId || undefined,
          staffName: selectedStaff?.name,
          injuryHistory: injuryHistory.trim() || undefined,
          bilateralTests,
          manualStrengthTest: manualStrengthTest.trim() || undefined,
          observations: observations.trim() || undefined,
          outcome,
          evaluatedAt: `${evaluatedAt}T12:00:00.000Z`,
        },
      );
      setBilateralTests(emptyTryoutBilateralTests());
      setInjuryHistory("");
      setManualStrengthTest("");
      setObservations("");
      setOutcome("");
      setShowValidationErrors(false);
      setValidationBanner(null);
      await loadProspects();
      const emailNote = data?.emailNotification?.error
        ? ` E-mail: ${data.emailNotification.error}`
        : "";
      setFeedback({
        open: true,
        title: "Liberação registrada",
        message: `Avaliação fisioterapêutica de try-out salva.${emailNote}`,
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const tryoutProspects = prospects;

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link href="/dashboard/saude/fisioterapia">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Liberação try-out</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova liberação fisioterapêutica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {validationBanner ? (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {validationBanner}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div id="tryout-field-clube" className="grid gap-2 scroll-mt-24">
              <Label>Clube *</Label>
              <NativeSelect
                className={fieldHighlight(showValidationErrors && !tenantId.trim())}
                value={tenantId}
                onChange={(e) => { setTenantId(e.target.value); setProspectId(""); setValidationBanner(null); }}
              >
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div id="tryout-field-atleta" className="grid gap-2 scroll-mt-24">
              <Label>Atleta try-out *</Label>
              <NativeSelect
                className={fieldHighlight(showValidationErrors && !prospectId.trim())}
                value={prospectId}
                onChange={(e) => { setProspectId(e.target.value); setValidationBanner(null); }}
                disabled={!tenantId || loadingProspects}
              >
                <option value="">Selecione</option>
                {tryoutProspects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.targetCategory ? ` · ${p.targetCategory}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Data *</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={evaluatedAt}
                onChange={(e) => setEvaluatedAt(e.target.value)}
              />
            </div>
            <div id="tryout-field-fisioterapeuta" className="grid gap-2 scroll-mt-24">
              <Label>Fisioterapeuta *</Label>
              <NativeSelect
                className={fieldHighlight(showValidationErrors && !staffId.trim())}
                value={staffId}
                onChange={(e) => { setStaffId(e.target.value); setValidationBanner(null); }}
              >
                <option value="">—</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {selectedProspect ? (
            <p className="text-sm text-muted-foreground">
              {selectedProspect.name}
              {selectedProspect.targetCategory ? ` · ${selectedProspect.targetCategory}` : ""}
            </p>
          ) : null}

          <div id="tryout-field-injury-history" className="grid gap-2 scroll-mt-24">
            <Label>Histórico de lesão *</Label>
            <Textarea
              className={cn("text-foreground", fieldHighlight(showValidationErrors && !injuryHistory.trim()))}
              value={injuryHistory}
              onChange={(e) => { setInjuryHistory(e.target.value); setValidationBanner(null); }}
            />
          </div>

          <div className="space-y-4 overflow-x-auto">
            <Label>Testes bilaterais *</Label>
            <p className="text-xs text-muted-foreground">
              Cada teste exige resposta e resultado (aprovado/reprovado) em direita e esquerda.
            </p>
            {TRYOUT_CLEARANCE_TESTS.map((key) => {
              const testHasError =
                showValidationErrors &&
                (["right", "left"] as const).some((side) => {
                  const inv = isTryoutBilateralSideInvalid(bilateralTests, key, side, true);
                  return inv.response || inv.outcome;
                });
              return (
              <div
                key={key}
                id={`tryout-test-${key}`}
                className={cn(
                  "min-w-[640px] scroll-mt-24 rounded-lg border p-3",
                  testHasError ? "border-red-500/50 bg-red-500/5" : "border-border/60",
                )}
              >
                <p className="mb-2 text-sm font-medium">{TRYOUT_CLEARANCE_TEST_LABELS[key]}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["right", "left"] as const).map((side) => {
                    const invalid = isTryoutBilateralSideInvalid(
                      bilateralTests,
                      key,
                      side,
                      showValidationErrors,
                    );
                    return (
                    <div
                      key={side}
                      className={cn(
                        "space-y-2 rounded border p-2",
                        invalid.response || invalid.outcome
                          ? "border-red-500/50 bg-red-500/5"
                          : "border-border/40",
                      )}
                    >
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        {side === "right" ? "Direita" : "Esquerda"}
                      </p>
                      <Input
                        id={`tryout-test-${key}-${side}-response`}
                        placeholder="Resposta *"
                        className={fieldHighlight(invalid.response)}
                        value={bilateralTests[key][side].response ?? ""}
                        onChange={(e) => updateSide(key, side, "response", e.target.value)}
                      />
                      <NativeSelect
                        id={`tryout-test-${key}-${side}-outcome`}
                        className={fieldHighlight(invalid.outcome)}
                        value={bilateralTests[key][side].outcome ?? ""}
                        onChange={(e) => updateSide(key, side, "outcome", e.target.value)}
                      >
                        <option value="">Resultado</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="reprovado">Reprovado</option>
                      </NativeSelect>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
            })}
          </div>

          <div id="tryout-field-manual-strength" className="grid gap-2 scroll-mt-24">
            <Label>Teste de força manual *</Label>
            <Textarea
              className={cn(
                "text-foreground",
                fieldHighlight(showValidationErrors && !manualStrengthTest.trim()),
              )}
              value={manualStrengthTest}
              onChange={(e) => { setManualStrengthTest(e.target.value); setValidationBanner(null); }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea className="text-foreground" value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
          <div id="tryout-field-outcome" className="grid gap-2 scroll-mt-24 sm:max-w-xs">
            <Label>Resultado final *</Label>
            <NativeSelect
              className={fieldHighlight(
                showValidationErrors && outcome !== "aprovado" && outcome !== "reprovado",
              )}
              value={outcome}
              onChange={(e) => { setOutcome(e.target.value as typeof outcome); setValidationBanner(null); }}
            >
              <option value="">Selecione</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
            </NativeSelect>
          </div>

          <Button
            onClick={() => {
              if (!formComplete) {
                runClientValidation();
                return;
              }
              void handleSave();
            }}
            disabled={saving}
            className="min-h-[44px]"
            aria-disabled={!formComplete && !saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar liberação
          </Button>
          {!formComplete && !saving ? (
            <p className="text-xs text-muted-foreground">
              O envio só é concluído com clube, atleta, avaliador, histórico de lesões, força manual,
              os 10 testes bilaterais (D/E) e resultado final. Toque em Salvar para ver o que falta.
            </p>
          ) : null}
        </CardContent>
      </Card>

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
