"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import {
  encodeGameKey,
  MATCH_INCIDENT_KIND_LABELS,
  MATCH_INCIDENT_KIND_OPTIONS,
  type FutebolMatchIncident,
} from "@/lib/futebol-jogos.types";

interface Props {
  tenantId: string;
  gameKey: string;
  incidents: FutebolMatchIncident[];
  occurrencesText: string | null;
  onChanged: () => void;
}

export function JogosOcorrenciasPanel({
  tenantId,
  gameKey,
  incidents,
  occurrencesText,
  onChanged,
}: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [kind, setKind] = useState("observacao");
  const [description, setDescription] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const resetForm = () => {
    setEditId(null);
    setKind("observacao");
    setDescription("");
    setMinute("");
    setPeriod("");
    setOpenForm(false);
  };

  const startEdit = (row: FutebolMatchIncident) => {
    if (row.source !== "manual") return;
    setEditId(row.id);
    setKind(row.kind);
    setDescription(row.description);
    setMinute(row.minute != null ? String(row.minute) : "");
    setPeriod(row.period ?? "");
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setFeedback({ open: true, title: "Campo obrigatório", message: "Informe a descrição." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind,
        description: description.trim(),
        minute: minute.trim() ? Number(minute) : null,
        period: period.trim() || null,
      };
      if (editId) {
        await api.patch(`/futebol-jogos/incidents/${editId}?tenantId=${tenantId}`, payload);
      } else {
        await api.post(
          `/futebol-jogos/${encodeGameKey(gameKey)}/incidents?tenantId=${tenantId}`,
          payload,
        );
      }
      resetForm();
      onChanged();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar a ocorrência." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.delete(`/futebol-jogos/incidents/${deleteId}?tenantId=${tenantId}`);
      setDeleteId(null);
      onChanged();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível apagar a ocorrência." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {occurrencesText ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Texto oficial (FMF)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{occurrencesText}</pre>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {incidents.length === 0 ? "Nenhuma ocorrência registrada." : `${incidents.length} ocorrência(s)`}
        </p>
        <Button
          type="button"
          size="sm"
          className="min-h-[44px]"
          onClick={() => {
            resetForm();
            setOpenForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar ocorrência
        </Button>
      </div>

      {openForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editId ? "Editar ocorrência" : "Nova ocorrência"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <NativeSelectField
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                options={MATCH_INCIDENT_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Minuto</Label>
                <Input
                  type="number"
                  min={0}
                  className="text-foreground"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <NativeSelectField
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="Opcional"
                  options={[
                    { value: "1T", label: "1º tempo" },
                    { value: "2T", label: "2º tempo" },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                className="min-h-[100px] text-foreground"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-[44px]" disabled={saving} onClick={() => void handleSave()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={saving} onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {incidents.map((row) => (
          <li key={row.id} className="rounded-lg border border-border/60 p-3 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                    {MATCH_INCIDENT_KIND_LABELS[row.kind] ?? row.kind}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.source === "fmf" ? "FMF" : "Manual"}
                  </span>
                  {row.minute != null ? (
                    <span className="text-xs text-muted-foreground">
                      {row.minute}&apos;{row.period ? ` ${row.period}` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap">{row.description}</p>
              </div>
              {row.source === "manual" ? (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" className="min-h-[36px]" onClick={() => startEdit(row)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-[36px] text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Apagar
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar ocorrência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant="error"
      />
    </div>
  );
}
