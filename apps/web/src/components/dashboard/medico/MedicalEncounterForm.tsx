"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type {
  MedicalEncounter,
  MedicalEncounterAttachment,
  MedicalPrescriptionItem,
} from "@/types/medical-encounter";
import type { MedicalStaffOption } from "@/components/dashboard/MedicalHistoryBlock";

type PhysioSessionOpt = { id: string; diagnosisLabel?: string | null; status: string };

const emptyRx = (): MedicalPrescriptionItem => ({
  medication: "",
  presentation: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export function MedicalEncounterForm({
  tenantId,
  playerId,
  playerName,
  encounterId,
}: {
  tenantId: string;
  playerId: string;
  playerName: string;
  encounterId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!encounterId);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [staff, setStaff] = useState<MedicalStaffOption[]>([]);
  const [physioSessions, setPhysioSessions] = useState<PhysioSessionOpt[]>([]);

  const [occurredAt, setOccurredAt] = useState("");
  const [physicianStaffId, setPhysicianStaffId] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [anamnesis, setAnamnesis] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [conduct, setConduct] = useState("");
  const [examsRequested, setExamsRequested] = useState("");
  const [observations, setObservations] = useState("");
  const [restrictTraining, setRestrictTraining] = useState(false);
  const [restrictMatch, setRestrictMatch] = useState(false);
  const [returnForecastAt, setReturnForecastAt] = useState("");
  const [referPhysio, setReferPhysio] = useState(false);
  const [referPhysioNotes, setReferPhysioNotes] = useState("");
  const [referPhysioSessionId, setReferPhysioSessionId] = useState("");
  const [prescriptions, setPrescriptions] = useState<MedicalPrescriptionItem[]>([emptyRx()]);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setOccurredAt(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    api
      .get<MedicalStaffOption[]>(`/medical-staff?tenantId=${tenantId}&role=medico`)
      .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]));
    api
      .get<{ physioSessions: PhysioSessionOpt[] }>(
        `/medical-encounters/referral-options/${playerId}`,
      )
      .then(({ data }) =>
        setPhysioSessions(Array.isArray(data.physioSessions) ? data.physioSessions : []),
      )
      .catch(() => setPhysioSessions([]));
  }, [tenantId, playerId]);

  useEffect(() => {
    if (!encounterId) return;
    setLoading(true);
    api
      .get<MedicalEncounter>(`/medical-encounters/${encounterId}`)
      .then(({ data }) => {
        const d = new Date(data.occurredAt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setOccurredAt(d.toISOString().slice(0, 16));
        setPhysicianStaffId(data.physicianStaffId ?? "");
        setPhysicianName(data.physicianName ?? "");
        setChiefComplaint(data.chiefComplaint ?? "");
        setAnamnesis(data.anamnesis ?? "");
        setPhysicalExam(data.physicalExam ?? "");
        setDiagnosis(data.diagnosis ?? "");
        setConduct(data.conduct ?? "");
        setExamsRequested(data.examsRequested ?? "");
        setObservations(data.observations ?? "");
        setRestrictTraining(data.restrictTraining);
        setRestrictMatch(data.restrictMatch);
        setReturnForecastAt(data.returnForecastAt?.slice(0, 10) ?? "");
        setReferPhysio(data.referPhysio);
        setReferPhysioNotes(data.referPhysioNotes ?? "");
        setReferPhysioSessionId(data.referPhysioSessionId ?? "");
        setPrescriptions(
          data.prescriptions?.length ? data.prescriptions : [emptyRx()],
        );
      })
      .catch(() =>
        setFeedback({ title: "Erro", message: "Não foi possível carregar o atendimento." }),
      )
      .finally(() => setLoading(false));
  }, [encounterId]);

  const handleStaffChange = (id: string) => {
    setPhysicianStaffId(id);
    const found = staff.find((s) => s.id === id);
    if (found) setPhysicianName(found.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      tenantId,
      playerId,
      occurredAt: new Date(occurredAt).toISOString(),
      physicianStaffId: physicianStaffId || undefined,
      physicianName: physicianName || undefined,
      chiefComplaint: chiefComplaint || undefined,
      anamnesis: anamnesis || undefined,
      physicalExam: physicalExam || undefined,
      diagnosis: diagnosis || undefined,
      conduct: conduct || undefined,
      examsRequested: examsRequested || undefined,
      observations: observations || undefined,
      restrictTraining,
      restrictMatch,
      returnForecastAt: returnForecastAt || undefined,
      referPhysio,
      referPhysioNotes: referPhysio ? referPhysioNotes || undefined : undefined,
      referPhysioSessionId: referPhysioSessionId || undefined,
      prescriptions: prescriptions.filter((p) => p.medication.trim()),
      status: "finalized" as const,
    };
    try {
      if (encounterId) {
        await api.patch(`/medical-encounters/${encounterId}`, payload);
      } else {
        await api.post("/medical-encounters", payload);
      }
      router.push(`/dashboard/medico/prontuario/${playerId}`);
      router.refresh();
    } catch {
      setFeedback({
        title: "Erro ao salvar",
        message: "Verifique os campos e tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-sm text-muted-foreground">Atleta: {playerName}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="occurredAt">Data e hora</Label>
            <Input
              id="occurredAt"
              type="datetime-local"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="physician">Médico responsável</Label>
            <NativeSelect
              id="physician"
              value={physicianStaffId}
              onChange={(e) => handleStaffChange(e.target.value)}
            >
              <option value="">Selecione ou informe abaixo</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            <Input
              placeholder="Nome do médico"
              value={physicianName}
              onChange={(e) => setPhysicianName(e.target.value)}
            />
          </div>
        </div>

        {[
          ["chiefComplaint", "Motivo / queixa", chiefComplaint, setChiefComplaint],
          ["anamnesis", "Anamnese / evolução", anamnesis, setAnamnesis],
          ["physicalExam", "Avaliação / exame físico", physicalExam, setPhysicalExam],
          ["diagnosis", "Diagnóstico / hipótese", diagnosis, setDiagnosis],
          ["conduct", "Conduta", conduct, setConduct],
          ["examsRequested", "Exames solicitados", examsRequested, setExamsRequested],
          ["observations", "Observações", observations, setObservations],
        ].map(([id, label, val, setVal]) => (
          <div key={id as string} className="space-y-2">
            <Label htmlFor={id as string}>{label as string}</Label>
            <Textarea
              id={id as string}
              rows={3}
              value={val as string}
              onChange={(e) => (setVal as (v: string) => void)(e.target.value)}
            />
          </div>
        ))}

        <div className="rounded-lg border border-border/80 p-4 space-y-3">
          <p className="text-sm font-medium">Restrição e retorno</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={restrictTraining}
              onChange={(e) => setRestrictTraining(e.target.checked)}
            />
            Restringir treino
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={restrictMatch}
              onChange={(e) => setRestrictMatch(e.target.checked)}
            />
            Restringir jogo
          </label>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="returnForecastAt">Previsão de retorno</Label>
            <Input
              id="returnForecastAt"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={returnForecastAt}
              onChange={(e) => setReturnForecastAt(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Registro clínico no prontuário. Não altera automaticamente o status operacional
            sincronizado pela fisioterapia.
          </p>
        </div>

        <div className="rounded-lg border border-border/80 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={referPhysio}
              onChange={(e) => setReferPhysio(e.target.checked)}
            />
            Encaminhar para fisioterapia
          </label>
          {referPhysio ? (
            <>
              <Textarea
                rows={2}
                placeholder="Orientações do encaminhamento"
                value={referPhysioNotes}
                onChange={(e) => setReferPhysioNotes(e.target.value)}
              />
              {physioSessions.length > 0 ? (
                <NativeSelect
                  value={referPhysioSessionId}
                  onChange={(e) => setReferPhysioSessionId(e.target.value)}
                >
                  <option value="">Vincular sessão fisio ativa (opcional)</option>
                  {physioSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.diagnosisLabel ?? s.id}
                    </option>
                  ))}
                </NativeSelect>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Prescrição / medicamentos</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrescriptions((p) => [...p, emptyRx()])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Item
            </Button>
          </div>
          {prescriptions.map((rx, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2"
            >
              <Input
                placeholder="Medicamento *"
                value={rx.medication}
                onChange={(e) => {
                  const next = [...prescriptions];
                  next[idx] = { ...next[idx], medication: e.target.value };
                  setPrescriptions(next);
                }}
              />
              <Input
                placeholder="Apresentação / concentração"
                value={rx.presentation ?? ""}
                onChange={(e) => {
                  const next = [...prescriptions];
                  next[idx] = { ...next[idx], presentation: e.target.value };
                  setPrescriptions(next);
                }}
              />
              <Input
                placeholder="Dose"
                value={rx.dose ?? ""}
                onChange={(e) => {
                  const next = [...prescriptions];
                  next[idx] = { ...next[idx], dose: e.target.value };
                  setPrescriptions(next);
                }}
              />
              <Input
                placeholder="Via"
                value={rx.route ?? ""}
                onChange={(e) => {
                  const next = [...prescriptions];
                  next[idx] = { ...next[idx], route: e.target.value };
                  setPrescriptions(next);
                }}
              />
              <Input
                placeholder="Frequência"
                value={rx.frequency ?? ""}
                onChange={(e) => {
                  const next = [...prescriptions];
                  next[idx] = { ...next[idx], frequency: e.target.value };
                  setPrescriptions(next);
                }}
              />
              <Input
                placeholder="Duração"
                value={rx.duration ?? ""}
                onChange={(e) => {
                  const next = [...prescriptions];
                  next[idx] = { ...next[idx], duration: e.target.value };
                  setPrescriptions(next);
                }}
              />
              <div className="sm:col-span-2 flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Instruções"
                  value={rx.instructions ?? ""}
                  onChange={(e) => {
                    const next = [...prescriptions];
                    next[idx] = { ...next[idx], instructions: e.target.value };
                    setPrescriptions(next);
                  }}
                />
                {prescriptions.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setPrescriptions((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar atendimento
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/medico/prontuario/${playerId}`)}
          >
            Cancelar
          </Button>
        </div>
      </form>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
