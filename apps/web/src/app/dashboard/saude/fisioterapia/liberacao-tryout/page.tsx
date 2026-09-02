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
  type TryoutBilateralTests,
} from "@/lib/physio-tryout-labels";

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
  const [feedback, setFeedback] = useState({
    open: false,
    title: "",
    message: "",
    variant: "info" as "info" | "success" | "warning" | "error",
  });

  const selectedStaff = staffList.find((s) => s.id === staffId);
  const selectedProspect = prospects.find((p) => p.id === prospectId);

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
  };

  const handleSave = async () => {
    if (!tenantId || !prospectId || !outcome) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Informe clube, atleta try-out e resultado final.",
        variant: "warning",
      });
      return;
    }
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Clube *</Label>
              <NativeSelect value={tenantId} onChange={(e) => { setTenantId(e.target.value); setProspectId(""); }}>
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Atleta try-out *</Label>
              <NativeSelect value={prospectId} onChange={(e) => setProspectId(e.target.value)} disabled={!tenantId || loadingProspects}>
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
            <div className="grid gap-2">
              <Label>Fisioterapeuta</Label>
              <NativeSelect value={staffId} onChange={(e) => setStaffId(e.target.value)}>
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

          <div className="grid gap-2">
            <Label>Histórico de lesão</Label>
            <Textarea className="text-foreground" value={injuryHistory} onChange={(e) => setInjuryHistory(e.target.value)} />
          </div>

          <div className="space-y-4 overflow-x-auto">
            <Label>Testes bilaterais</Label>
            {TRYOUT_CLEARANCE_TESTS.map((key) => (
              <div key={key} className="min-w-[640px] rounded-lg border border-border/60 p-3">
                <p className="mb-2 text-sm font-medium">{TRYOUT_CLEARANCE_TEST_LABELS[key]}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["right", "left"] as const).map((side) => (
                    <div key={side} className="space-y-2 rounded border border-border/40 p-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        {side === "right" ? "Direita" : "Esquerda"}
                      </p>
                      <Input
                        placeholder="Resposta"
                        value={bilateralTests[key][side].response ?? ""}
                        onChange={(e) => updateSide(key, side, "response", e.target.value)}
                      />
                      <NativeSelect
                        value={bilateralTests[key][side].outcome ?? ""}
                        onChange={(e) => updateSide(key, side, "outcome", e.target.value)}
                      >
                        <option value="">Resultado</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="reprovado">Reprovado</option>
                      </NativeSelect>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <Label>Teste de força manual</Label>
            <Textarea className="text-foreground" value={manualStrengthTest} onChange={(e) => setManualStrengthTest(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea className="text-foreground" value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label>Resultado final *</Label>
            <NativeSelect value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
              <option value="">Selecione</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
            </NativeSelect>
          </div>

          <Button onClick={() => void handleSave()} disabled={saving} className="min-h-[44px]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar liberação
          </Button>
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
