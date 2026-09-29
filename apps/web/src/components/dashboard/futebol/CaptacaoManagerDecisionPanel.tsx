"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { type ScoutingProspect } from "@/lib/captacao-types";
import { formatDateDayMonYear } from "@/lib/format-date";

function canDecideAsGerente(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "gerente" || r === "gestor" || r === "super_admin" || r === "company_admin";
}

const DECISION_LABELS: Record<string, string> = {
  pendente: "Aguardando decisão",
  aprovado: "Continuidade aprovada",
  reprovado: "Reprovado",
  ajuste: "Devolvido para ajuste",
};

type Props = {
  prospect: ScoutingProspect;
  initialDecision?: "aprovado" | "reprovado" | null;
  onUpdated: () => void;
};

export function CaptacaoManagerDecisionPanel({ prospect, initialDecision, onUpdated }: Props) {
  const { role } = useAuth();
  const allowed = canDecideAsGerente(role);
  const decision = prospect.managerDecision ?? "pendente";
  const tryoutStage = (prospect as ScoutingProspect & { tryoutEffectiveStage?: string })
    .tryoutEffectiveStage;
  const showForm =
    allowed &&
    (tryoutStage === "aguardando_gerencia" || prospect.evaluationOutcome === "aprovado") &&
    (decision === "pendente" || decision === "ajuste");

  const [presentationDate, setPresentationDate] = useState(prospect.presentationDate ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  useEffect(() => {
    if (initialDecision === "aprovado" || initialDecision === "reprovado") {
      setNotes("");
    }
  }, [initialDecision, prospect.id]);

  const inTryoutManager =
    tryoutStage === "aguardando_gerencia" || prospect.evaluationOutcome === "aprovado";
  if (!inTryoutManager) return null;

  async function submit(decision: "aprovado" | "reprovado" | "ajuste") {
    if (decision === "aprovado" && !presentationDate.trim()) {
      setFeedback({
        open: true,
        title: "Data de apresentação",
        message: "Informe a data de apresentação no clube para aprovar a continuidade.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/captacao/prospects/${prospect.id}/manager-decision`, {
        decision,
        notes: notes.trim() || undefined,
        presentationDate: decision === "aprovado" ? presentationDate.trim() : undefined,
      });
      setFeedback({
        open: true,
        title: "Decisão registrada",
        message:
          decision === "aprovado"
            ? "Continuidade aprovada."
            : decision === "reprovado"
              ? "Prospect reprovado."
              : "Devolvido para ajuste.",
        variant: "success",
      });
      onUpdated();
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível registrar a decisão.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="border-violet-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            Decisão do gerente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Status: <span className="text-foreground">{DECISION_LABELS[decision] ?? decision}</span>
            {prospect.managerDecisionAt ? (
              <>
                {" "}
                · {formatDateDayMonYear(prospect.managerDecisionAt)}
                {prospect.managerDecisionBy ? ` · ${prospect.managerDecisionBy}` : ""}
              </>
            ) : null}
          </p>
          {prospect.managerDecisionNotes ? (
            <p className="whitespace-pre-wrap text-sm">{prospect.managerDecisionNotes}</p>
          ) : null}

          {showForm ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mgr-presentation">Data de apresentação (obrigatória para aprovar)</Label>
                <Input
                  id="mgr-presentation"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={presentationDate}
                  onChange={(e) => setPresentationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mgr-notes">Observações</Label>
                <Textarea
                  id="mgr-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button
                  type="button"
                  disabled={saving}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-600/90"
                  onClick={() => void submit("aprovado")}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Aprovar continuidade
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  className="min-h-[44px]"
                  onClick={() => void submit("reprovado")}
                >
                  Reprovar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  className="min-h-[44px]"
                  onClick={() => void submit("ajuste")}
                >
                  Devolver
                </Button>
              </div>
              {initialDecision === "aprovado" ? (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Você abriu esta ficha pelo link de aprovação do e-mail — confirme a data e clique em Aprovar
                  continuidade.
                </p>
              ) : initialDecision === "reprovado" ? (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Link do e-mail: confirme clicando em Reprovar.
                </p>
              ) : null}
            </div>
          ) : !allowed && decision === "pendente" ? (
            <p className="text-sm text-muted-foreground">Aguardando o gerente de futebol.</p>
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
    </>
  );
}
