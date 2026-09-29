"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { CoachTrainingSession } from "@/lib/treinadores-types";

type PseRow = {
  playerId: string;
  name: string;
  contactEmail: string | null;
  submitted: boolean;
  rpe: number | null;
  submittedAt: string | null;
};

interface Props {
  tenantId: string;
  category?: string;
}

export function PrepFisicaPseTab({ tenantId, category }: Props) {
  const [sessions, setSessions] = useState<CoachTrainingSession[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<PseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (!tenantId) return;
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<CoachTrainingSession[]>(`/prep-fisica/training-sessions?${params}`)
      .then(({ data }) => {
        const list = (Array.isArray(data) ? data : []).filter((s) => s.status === "finalizado");
        setSessions(list);
        if (!selectedId && list[0]) setSelectedId(list[0].id);
      })
      .catch(() => setSessions([]));
  }, [tenantId, category]);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    setLoading(true);
    api
      .get<PseRow[]>(`/prep-fisica/training-sessions/${selectedId}/pse-status`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleLink = async (playerId: string) => {
    try {
      const { data } = await api.post<{ url: string }>(`/prep-fisica/training-sessions/${selectedId}/pse-link`, {
        playerId,
      });
      if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        setFeedback({ open: true, title: "Link copiado", message: "Envie o link ao atleta." });
      }
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível gerar o link.",
      });
    }
  };

  const handleCsvImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: Array<{ email: string; sessionDate: string; category: string; rpe: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (i === 0 && /email/i.test(line)) continue;
      const parts = line.split(/[,;]/).map((p) => p.trim());
      if (parts.length < 4) continue;
      const rpe = Number(parts[3]);
      if (!Number.isFinite(rpe)) continue;
      parsed.push({
        email: parts[0]!,
        sessionDate: parts[1]!,
        category: parts[2]!,
        rpe: Math.round(rpe),
      });
    }
    if (parsed.length === 0) {
      setFeedback({ open: true, title: "Atenção", message: "Nenhuma linha válida no CSV." });
      return;
    }
    try {
      const { data } = await api.post<{ ok: number; errors: string[] }>("/prep-fisica/pse/import-csv", {
        tenantId,
        rows: parsed,
      });
      setFeedback({
        open: true,
        title: "Importação",
        message: `${data?.ok ?? 0} registro(s). ${(data?.errors?.length ?? 0) > 0 ? `Erros: ${data!.errors.slice(0, 3).join("; ")}` : ""}`,
      });
      if (selectedId) {
        const { data: status } = await api.get<PseRow[]>(`/prep-fisica/training-sessions/${selectedId}/pse-status`);
        setRows(Array.isArray(status) ? status : []);
      }
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha na importação.",
      });
    }
  };

  const submitted = rows.filter((r) => r.submitted).length;
  const rate = rows.length ? Math.round((submitted / rows.length) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessões finalizadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão finalizada.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm ${selectedId === s.id ? "border-primary bg-primary/5" : "border-border/60"}`}
              >
                {formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`))}
                {s.category ? ` · ${s.category}` : ""}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">PSE por atleta</CardTitle>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <Upload className="h-4 w-4" />
            Importar CSV (Forms)
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCsvImport(f);
                e.target.value = "";
              }}
            />
          </label>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conclusão: {submitted}/{rows.length} ({rate}%)
          </p>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.playerId}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.submitted ? `PSE ${r.rpe ?? "—"}` : "Pendente"}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleLink(r.playerId)}>
                    <Copy className="mr-1 h-4 w-4" />
                    {r.submitted ? "Reenviar link" : "Copiar link"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.title === "Erro" ? "error" : "success"}
      />
    </div>
  );
}
