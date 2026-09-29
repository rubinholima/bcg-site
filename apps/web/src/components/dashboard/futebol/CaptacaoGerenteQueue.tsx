"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  type ScoutingProspect,
  labelForPriority,
  priorityBadgeClass,
} from "@/lib/captacao-types";
import { formatMobileRating } from "@/lib/captacao-mobile-flow";
import { cn } from "@/lib/utils";

function canDecideAsGerente(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "gerente" || r === "gestor" || r === "super_admin" || r === "company_admin";
}

export function CaptacaoGerenteQueue({ tenantId }: { tenantId: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<ScoutingProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [presentationDate, setPresentationDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "warning" | "error";
  }>({ open: false, title: "", message: "", variant: "info" });

  const allowed = canDecideAsGerente(role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<ScoutingProspect[]>(`/captacao/manager-queue${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(decision: "aprovado" | "reprovado" | "ajuste") {
    if (!activeId) return;
    if (decision === "aprovado" && !presentationDate) {
      setFeedback({
        open: true,
        title: "Data de apresentação",
        message: "Informe a data de apresentação no clube.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/captacao/prospects/${activeId}/manager-decision`, {
        decision,
        notes: notes.trim() || undefined,
        presentationDate: decision === "aprovado" ? presentationDate : undefined,
      });
      setActiveId(null);
      setNotes("");
      setPresentationDate("");
      await load();
      setFeedback({
        open: true,
        title: "Decisão registrada",
        message:
          decision === "aprovado"
            ? "Integração direta aprovada — supervisor notificado via histórico."
            : decision === "reprovado"
              ? "Prospect recusado."
              : "Devolvido ao captador para ajustes.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Decisões de integração direta são exclusivas do gerente de futebol.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma indicação de integração direta pendente.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-2">
      {rows.map((row) => (
        <div key={row.id} className="space-y-3 rounded-xl border border-border/60 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-muted-foreground">{row.position ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                T {formatMobileRating(row.technicalRating)} · Ta{" "}
                {formatMobileRating(row.tacticalRating)} · F {formatMobileRating(row.physicalRating)} · C{" "}
                {formatMobileRating(row.cognitiveRating)}
              </p>
              <span
                className={cn(
                  "mt-1 inline-block rounded border px-2 py-0.5 text-xs",
                  priorityBadgeClass(row.priority),
                )}
              >
                {labelForPriority(row.priority)}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant={activeId === row.id ? "default" : "outline"}
              className="min-h-[44px]"
              onClick={() => setActiveId(activeId === row.id ? null : row.id)}
            >
              <ShieldCheck className="mr-1 h-4 w-4" />
              Decidir
            </Button>
          </div>
          {row.descriptiveObservation ? (
            <p className="text-sm text-muted-foreground line-clamp-3">{row.descriptiveObservation}</p>
          ) : null}
          {activeId === row.id ? (
            <div className="space-y-3 border-t border-border/40 pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <Label>Data apresentação (se aprovar)</Label>
                  <Input
                    type="date"
                    value={presentationDate}
                    onChange={(e) => setPresentationDate(e.target.value)}
                    className="min-h-[44px] text-foreground md:min-h-10 [&::-webkit-datetime-edit]:text-foreground"
                  />
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <Label>Observações</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[44px] md:min-h-10"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col xl:flex-row">
                <Button
                  type="button"
                  className="min-h-[44px] sm:flex-1 lg:flex-none xl:flex-1"
                  disabled={saving}
                  onClick={() => void decide("aprovado")}
                >
                  Aprovar integração
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] sm:flex-1 lg:flex-none xl:flex-1"
                  disabled={saving}
                  onClick={() => void decide("ajuste")}
                >
                  Devolver para ajuste
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] text-destructive sm:flex-1 lg:flex-none xl:flex-1"
                  disabled={saving}
                  onClick={() => void decide("reprovado")}
                >
                  Reprovar
                </Button>
              </div>
            </div>
          ) : null}
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link href={`/dashboard/futebol/captacao/prospects/${row.id}?tenantId=${row.tenantId}`}>
              Ver avaliação completa
            </Link>
          </Button>
        </div>
      ))}
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
