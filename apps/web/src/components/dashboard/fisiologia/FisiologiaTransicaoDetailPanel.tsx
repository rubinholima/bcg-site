"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import type { PhysioTransitionProgramDetail } from "@/lib/fisiologia-transition-types";
import {
  formatDurationMinutes,
  PHYSIO_TRANSITION_WORK_TYPE_LABEL,
  transitionWorkTypeLabel,
} from "@/lib/physio-transition-labels";

const WORK_TYPES = Object.keys(PHYSIO_TRANSITION_WORK_TYPE_LABEL);

export function FisiologiaTransicaoDetailPanel({ programId }: { programId: string }) {
  const { categories: allCats } = useFixtureCategories();
  const [program, setProgram] = useState<PhysioTransitionProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workType, setWorkType] = useState("integrado_fisiologia_preparacao");
  const [workTypeLabel, setWorkTypeLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [objective, setObjective] = useState("");
  const [activities, setActivities] = useState("");
  const [evolutionNote, setEvolutionNote] = useState("");
  const [stillFeelsPain, setStillFeelsPain] = useState(false);
  const [evolutionScore, setEvolutionScore] = useState("");
  const [needsNewSession, setNeedsNewSession] = useState(true);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<PhysioTransitionProgramDetail>(
        `/fisiologia/transition-programs/${programId}`,
      );
      setProgram(data);
    } catch {
      setProgram(null);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalMinutes = useMemo(
    () => (program?.entries ?? []).reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [program?.entries],
  );

  const canRegister = program?.status === "active";

  const originLines = useMemo(() => {
    const empty = { regions: [] as string[], dx: [] as string[], tx: [] as string[] };
    if (!program?.originSession) return empty;
    const s = program.originSession;
    const regions =
      s.sessionRegions && s.sessionRegions.length > 0
        ? s.sessionRegions.map((r) => {
            const name = r.region?.namePt ?? "—";
            const side = r.side === "E" ? " (E)" : r.side === "D" ? " (D)" : "";
            return `${name}${side}`;
          })
        : s.region?.namePt
          ? [s.region.namePt]
          : [];
    const dx =
      s.sessionDiagnoses && s.sessionDiagnoses.length > 0
        ? s.sessionDiagnoses.map((d) => d.diagnosisLabel ?? d.diagnosis?.name).filter(Boolean) as string[]
        : s.diagnosisLabel
          ? [s.diagnosisLabel]
          : [];
    const tx =
      s.sessionTreatments && s.sessionTreatments.length > 0
        ? s.sessionTreatments.map((t) => t.treatmentLabel ?? t.treatment?.name).filter(Boolean) as string[]
        : s.treatmentLabel
          ? [s.treatmentLabel]
          : [];
    return { regions, dx, tx };
  }, [program?.originSession]);

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setFeedback({ open: true, title: "Horário", message: "Informe início e fim." });
      return;
    }
    if (workType === "outro" && !workTypeLabel.trim()) {
      setFeedback({ open: true, title: "Tipo de trabalho", message: "Descreva o tipo de trabalho." });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/fisiologia/transition-programs/${programId}/entries`, {
        sessionDate,
        workType,
        workTypeLabel: workType === "outro" ? workTypeLabel.trim() : undefined,
        startTime,
        endTime,
        objective: objective.trim() || undefined,
        activities: activities.trim() || undefined,
        evolutionNote: evolutionNote.trim() || undefined,
        stillFeelsPain,
        evolutionScore: evolutionScore ? Number(evolutionScore) : undefined,
        needsNewSession,
      });
      setObjective("");
      setActivities("");
      setEvolutionNote("");
      setStartTime("");
      setEndTime("");
      setEvolutionScore("");
      setStillFeelsPain(false);
      setNeedsNewSession(true);
      await load();
      setFeedback({
        open: true,
        title: needsNewSession ? "Sessão registrada" : "Transição concluída",
        message: needsNewSession
          ? "Sessão salva. O atleta permanece em transição."
          : "Última sessão registrada. Atleta liberado da transição, salvo outros bloqueios.",
      });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setFeedback({
        open: true,
        title: "Erro",
        message: msg ?? "Não foi possível registrar a sessão.",
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

  if (!program) {
    return (
      <div className="space-y-3">
        <p>Programa não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/futebol/fisiologia/transicoes">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/futebol/fisiologia/transicoes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Atletas em Transição
      </Link>

      <div>
        <h2 className="text-xl font-semibold">{program.player?.name}</h2>
        <p className="text-sm text-muted-foreground">
          {program.player?.category ? getCategoryLabel(program.player.category, "pt", allCats) : "—"}
          {" · "}
          Início {formatDateDayMonYear(program.startedAt)}
          {" · "}
          {program.status === "active" ? "Em transição" : "Concluída"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Origem — fisioterapia (somente leitura)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Encerramento:</span>{" "}
              {program.originSession.endedAt
                ? formatDateDayMonYear(program.originSession.endedAt)
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Região:</span>{" "}
              {originLines.regions?.join(", ") || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Diagnóstico:</span>{" "}
              {originLines.dx?.join(" + ") || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Tratamento:</span>{" "}
              {originLines.tx?.join(" + ") || "—"}
            </p>
            {program.originSession.symptoms ? (
              <p>
                <span className="text-muted-foreground">Sintomas:</span> {program.originSession.symptoms}
              </p>
            ) : null}
            <Button asChild variant="outline" size="sm" className="mt-2 min-h-[44px]">
              <Link href={`/dashboard/saude/fisioterapia/${program.originSessionId}`}>
                Ver atendimento fisio
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Sessões:</span> {program.entries.length}
            </p>
            <p>
              <span className="text-muted-foreground">Tempo total:</span> {formatDurationMinutes(totalMinutes)}
            </p>
            {program.completedAt ? (
              <p>
                <span className="text-muted-foreground">Conclusão:</span>{" "}
                {formatDateDayMonYear(program.completedAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de sessões</CardTitle>
        </CardHeader>
        <CardContent>
          {program.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {program.entries.map((e) => (
                <li key={e.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium">
                    {formatDateDayMonYear(e.sessionDate)} ·{" "}
                    {transitionWorkTypeLabel(e.workType, e.workTypeLabel)} ·{" "}
                    {formatDurationMinutes(e.durationMinutes)}
                  </p>
                  {e.objective ? (
                    <p className="mt-1">
                      <span className="text-muted-foreground">Objetivo:</span> {e.objective}
                    </p>
                  ) : null}
                  {e.activities ? (
                    <p className="mt-1">
                      <span className="text-muted-foreground">Descrição:</span> {e.activities}
                    </p>
                  ) : null}
                  {e.evolutionNote ? (
                    <p className="mt-1">
                      <span className="text-muted-foreground">Evolução:</span> {e.evolutionNote}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nova sessão: {e.needsNewSession ? "Sim" : "Não — alta da transição"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canRegister ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Registrar sessão de transição</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de trabalho</Label>
              <NativeSelect value={workType} onChange={(e) => setWorkType(e.target.value)}>
                {WORK_TYPES.map((k) => (
                  <option key={k} value={k}>
                    {PHYSIO_TRANSITION_WORK_TYPE_LABEL[k as keyof typeof PHYSIO_TRANSITION_WORK_TYPE_LABEL]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {workType === "outro" ? (
              <div className="sm:col-span-2">
                <Label>Descrição do tipo</Label>
                <Input value={workTypeLabel} onChange={(e) => setWorkTypeLabel(e.target.value)} />
              </div>
            ) : null}
            <div>
              <Label>Início</Label>
              <Input type="time" className="text-foreground" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" className="text-foreground" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Objetivo</Label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição / atividades</Label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Nota de evolução</Label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={evolutionNote}
                onChange={(e) => setEvolutionNote(e.target.value)}
              />
            </div>
            <div>
              <Label>Evolução (0–10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                className="text-foreground"
                value={evolutionScore}
                onChange={(e) => setEvolutionScore(e.target.value)}
              />
            </div>
            <label className="flex min-h-[44px] items-center gap-2 self-end">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={stillFeelsPain}
                onChange={(e) => setStillFeelsPain(e.target.checked)}
              />
              <span className="text-sm">Ainda sente dor</span>
            </label>
            <div className="sm:col-span-2">
              <Label>Necessário nova sessão?</Label>
              <NativeSelect
                value={needsNewSession ? "sim" : "nao"}
                onChange={(e) => setNeedsNewSession(e.target.value === "sim")}
              >
                <option value="sim">Sim — continua em transição</option>
                <option value="nao">Não — concluir transição (alta Performance)</option>
              </NativeSelect>
            </div>
            <div className="sm:col-span-2">
              <Button disabled={saving} className="min-h-[44px]" onClick={() => void handleSave()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar sessão
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
