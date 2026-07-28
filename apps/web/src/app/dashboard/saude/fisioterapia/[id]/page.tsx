"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhysioBodyMap } from "@/components/dashboard/fisioterapia/PhysioBodyMap";
import type { PhysioEvolutionNote, PhysioSession } from "@/types/fisioterapia";
import { FeedbackModal } from "@/components/ui/feedback-modal";

export default function FisioterapiaSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [session, setSession] = useState<PhysioSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [pain, setPain] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<PhysioSession>(`/fisioterapia/sessions/${id}`);
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
      return;
    }
    void load();
  }, [authLoading, canAccessModule, load, router]);

  const addEvolution = async () => {
    if (!id || !note.trim()) return;
    setSaving(true);
    try {
      await api.post(`/fisioterapia/sessions/${id}/evolution`, {
        note: note.trim(),
        painScore: pain ? Number(pain) : undefined,
      });
      setNote("");
      setPain("");
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar a evolução." });
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.post(`/fisioterapia/sessions/${id}/complete`);
      await load();
      setFeedback({
        open: true,
        title: "Alta registrada",
        message: "Tratamento finalizado. O status do atleta será liberado se não houver outros tratamentos ativos.",
      });
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível finalizar." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-3 p-6">
        <p>Atendimento não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/saude/fisioterapia">Voltar</Link>
        </Button>
      </div>
    );
  }

  const evolutions = (session.evolutionNotes ?? []) as PhysioEvolutionNote[];

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/saude/fisioterapia"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Fisioterapia
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.player?.name}</h1>
            <p className="text-muted-foreground">
              {session.tenant?.name}
              {session.category ? ` · ${session.category}` : ""}
            </p>
          </div>
          {session.status === "active" ? (
            <Button className="min-h-[44px]" disabled={saving} onClick={() => void complete()}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Dar alta
            </Button>
          ) : (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
              {session.status === "completed" ? "Alta" : "Cancelado"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardContent className="pt-4">
            <PhysioBodyMap
              view={(session.bodyMapView as "front" | "back") || "front"}
              selectedRegionId={session.regionId}
              selectedSide={session.side}
              marks={[
                {
                  regionId: session.regionId,
                  side: session.side,
                  view: session.bodyMapView,
                  x: session.bodyMapX,
                  y: session.bodyMapY,
                },
              ]}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Região:</span>{" "}
                {session.region?.namePt ?? session.regionId}
                {session.side === "E" ? " (E)" : session.side === "D" ? " (D)" : ""}
              </p>
              <p>
                <span className="text-muted-foreground">Diagnóstico:</span>{" "}
                {session.diagnosisLabel ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Tratamento:</span>{" "}
                {session.treatmentLabel ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Sintomas:</span> {session.symptoms ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Dor:</span>{" "}
                {session.painScore != null ? `${session.painScore}/10` : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Previsão:</span>{" "}
                {session.estimatedEndDate
                  ? new Date(session.estimatedEndDate).toLocaleDateString("pt-BR")
                  : session.estimatedDays
                    ? `${session.estimatedDays} dias`
                    : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Fisio:</span> {session.staffName ?? "—"}
              </p>
              {session.attachments && session.attachments.length > 0 ? (
                <div>
                  <p className="text-muted-foreground">Anexos:</p>
                  <ul className="mt-1 space-y-1">
                    {session.attachments.map((a, i) => (
                      <li key={`${a.url}-${i}`}>
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {session.playerId ? (
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/dashboard/cadastros/jogadores/${session.playerId}/edit?tab=fisioterapia`}>
                    Abrir ficha do atleta
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.status === "active" ? (
                <div className="grid gap-2">
                  <Label>Nova anotação</Label>
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="Dor 0–10"
                      className="w-28 text-foreground"
                      value={pain}
                      onChange={(e) => setPain(e.target.value)}
                    />
                    <Button disabled={saving || !note.trim()} onClick={() => void addEvolution()}>
                      Registrar evolução
                    </Button>
                  </div>
                </div>
              ) : null}
              {evolutions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem evoluções ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {[...evolutions].reverse().map((e, i) => (
                    <li key={`${e.at}-${i}`} className="rounded-lg border border-border/60 p-2 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.at).toLocaleString("pt-BR")}
                        {e.userName ? ` · ${e.userName}` : ""}
                        {e.painScore != null ? ` · dor ${e.painScore}/10` : ""}
                      </p>
                      <p className="mt-1">{e.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
