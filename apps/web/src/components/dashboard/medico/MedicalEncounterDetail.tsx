"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Pencil, Printer, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type {
  MedicalEncounter,
  MedicalEvolutionNote,
  MedicalExamRecord,
  MedicalEditLogEntry,
} from "@/types/medical-encounter";
import { printMedicalPrescription } from "@/lib/medical-prescription-print";
import { MEDICAL_RTP_LABELS } from "@/lib/medical-encounter-labels";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

export function MedicalEncounterDetail({
  playerId,
  encounter: initial,
  onUpdated,
}: {
  playerId: string;
  encounter: MedicalEncounter;
  onUpdated?: (enc: MedicalEncounter) => void;
}) {
  const [enc, setEnc] = useState(initial);
  const [evoText, setEvoText] = useState("");
  const [savingEvo, setSavingEvo] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const when = format(new Date(enc.occurredAt), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const evolutions = (enc.evolutionNotes ?? []) as MedicalEvolutionNote[];
  const examRecords = (enc.examRecords ?? []) as MedicalExamRecord[];
  const editLog = (enc.editLog ?? []) as MedicalEditLogEntry[];

  const submitEvolution = async () => {
    if (!evoText.trim()) return;
    setSavingEvo(true);
    try {
      const { data } = await api.post<MedicalEncounter>(
        `/medical-encounters/${enc.id}/evolution`,
        { note: evoText.trim() },
      );
      setEnc((prev) => ({
        ...prev,
        evolutionNotes: data.evolutionNotes ?? prev.evolutionNotes,
        editLog: data.editLog ?? prev.editLog,
      }));
      onUpdated?.(data);
      setEvoText("");
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível salvar a evolução." });
    } finally {
      setSavingEvo(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{when}</p>
          {enc.physicianName ? (
            <p className="text-sm">
              Dr(a). {enc.physicianName}
              {enc.physicianCrm ? ` · ${enc.physicianCrm}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(enc.prescriptions?.length ?? 0) > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9"
              onClick={() => printMedicalPrescription(enc)}
            >
              <Printer className="mr-1 h-4 w-4" />
              Imprimir prescrição
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="min-h-9" asChild>
            <Link href={`/dashboard/medico/prontuario/${playerId}/${enc.id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="min-h-9" asChild>
            <Link
              href={`/dashboard/medico/prontuario/${playerId}/novo?origin=${enc.id}`}
            >
              <Plus className="mr-1 h-4 w-4" />
              Evolução / retorno
            </Link>
          </Button>
        </div>
      </div>

      {enc.originEncounter ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Atendimento de origem:{" "}
          <Link
            href={`/dashboard/medico/prontuario/${playerId}/${enc.originEncounter.id}`}
            className="text-violet-300 hover:underline"
          >
            {format(new Date(enc.originEncounter.occurredAt), "dd/MM/yyyy", { locale: ptBR })}
            {enc.originEncounter.diagnosis ? ` — ${enc.originEncounter.diagnosis}` : ""}
          </Link>
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <Field label="Motivo / queixa" value={enc.chiefComplaint} />
        <Field label="Anamnese" value={enc.anamnesis} />
        <Field label="Exame físico" value={enc.physicalExam} />
        <Field label="Diagnóstico / hipótese" value={enc.diagnosis} />
        <Field label="Conduta" value={enc.conduct} />
        <Field label="Exames solicitados (texto)" value={enc.examsRequested} />
        <Field label="Observações" value={enc.observations} />

        {examRecords.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Exames e resultados</p>
            <ul className="mt-2 space-y-2">
              {examRecords.map((r, i) => (
                <li key={i} className="rounded border border-border/60 p-2 text-sm">
                  <span className="font-medium">
                    {r.type === "resultado" ? "Resultado" : "Solicitado"} — {r.title}
                  </span>
                  {r.notes ? <p className="text-muted-foreground">{r.notes}</p> : null}
                  {r.fileUrl ? (
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-violet-300 hover:underline"
                    >
                      Abrir documento
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(enc.attachments?.length ?? 0) > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Anexos</p>
            <ul className="mt-2 space-y-1 text-sm">
              {enc.attachments!.map((a, i) => (
                <li key={i}>
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-300 hover:underline"
                  >
                    {a.label ?? a.fileUrl}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(enc.restrictTraining ||
          enc.restrictMatch ||
          enc.returnForecastAt ||
          enc.rtpDecision) && (
          <div className="rounded-lg border border-border/80 p-3 text-sm">
            <p className="font-medium">Restrições e RTP (registro médico)</p>
            <ul className="mt-2 list-inside list-disc text-muted-foreground">
              {enc.restrictTraining ? <li>Treino restrito</li> : null}
              {enc.restrictMatch ? <li>Jogo restrito</li> : null}
              {enc.returnForecastAt ? (
                <li>
                  Previsão de retorno:{" "}
                  {format(new Date(enc.returnForecastAt), "dd/MM/yyyy", { locale: ptBR })}
                </li>
              ) : null}
              {enc.rtpDecision ? (
                <li>Liberação: {MEDICAL_RTP_LABELS[enc.rtpDecision] ?? enc.rtpDecision}</li>
              ) : null}
              {enc.medicalRtpReleasedAt ? (
                <li>
                  Data liberação:{" "}
                  {format(new Date(enc.medicalRtpReleasedAt), "dd/MM/yyyy", { locale: ptBR })}
                </li>
              ) : null}
            </ul>
            {enc.medicalRtpNotes ? (
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{enc.medicalRtpNotes}</p>
            ) : null}
          </div>
        )}

        {enc.referPhysio ? (
          <Field
            label="Encaminhamento fisioterapia"
            value={
              enc.referPhysioNotes ??
              (enc.referPhysioSession
                ? `Vinculado à sessão ${enc.referPhysioSession.diagnosisLabel ?? enc.referPhysioSessionId}`
                : "Sim")
            }
          />
        ) : null}

        {(enc.prescriptions?.length ?? 0) > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Prescrição</p>
            <ul className="mt-2 space-y-2">
              {enc.prescriptions!.map((rx, i) => (
                <li key={i} className="rounded border border-border/60 p-2 text-sm">
                  <p className="font-medium">{rx.medication}</p>
                  <p className="text-muted-foreground">
                    {[rx.presentation, rx.dose, rx.route, rx.frequency, rx.duration]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {rx.instructions ? (
                    <p className="mt-1 text-muted-foreground">{rx.instructions}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-8 space-y-3 border-t border-border/80 pt-6">
        <p className="font-medium text-sm">Evoluções / follow-up</p>
        {evolutions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma evolução registrada neste atendimento.</p>
        ) : (
          <ul className="space-y-2">
            {evolutions.map((n, i) => (
              <li key={i} className="rounded border border-border/60 p-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(n.at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  {n.userName ? ` · ${n.userName}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          rows={3}
          placeholder="Nova evolução clínica…"
          value={evoText}
          onChange={(e) => setEvoText(e.target.value)}
        />
        <Button
          type="button"
          disabled={savingEvo || !evoText.trim()}
          className="min-h-11"
          onClick={() => void submitEvolution()}
        >
          {savingEvo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Registrar evolução
        </Button>
      </div>

      {editLog.length > 0 ? (
        <div className="mt-8 border-t border-border/80 pt-6">
          <p className="mb-2 text-sm font-medium">Auditoria</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {editLog.map((e, i) => (
              <li key={i}>
                {format(new Date(e.at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {e.userName ? ` · ${e.userName}` : ""} — {e.action}
                {e.comment ? `: ${e.comment.slice(0, 80)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
