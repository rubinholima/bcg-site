"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  type ScoutingProspect,
  labelForPriority,
  priorityBadgeClass,
} from "@/lib/captacao-types";
import { formatMobileRating } from "@/lib/captacao-mobile-flow";
import { cn } from "@/lib/utils";

export function CaptacaoSupervisorQueue({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<ScoutingProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ctDate, setCtDate] = useState("");
  const [ctTime, setCtTime] = useState("09:00");
  const [ctRoom, setCtRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "warning" | "error";
  }>({ open: false, title: "", message: "", variant: "info" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<ScoutingProspect[]>(`/captacao/supervisor-queue${params}`);
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

  function openConfirm(row: ScoutingProspect) {
    setActiveId(row.id);
    const d = row.proposedCtAt ? new Date(row.proposedCtAt) : new Date();
    setCtDate(d.toISOString().slice(0, 10));
    setCtTime(d.toISOString().slice(11, 16));
    setCtRoom(row.ctRoom ?? "");
    setNotes("");
  }

  async function submit(action: "confirm" | "reschedule") {
    if (!activeId) return;
    if (!ctDate) {
      setFeedback({
        open: true,
        title: "Data",
        message: "Informe a data.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/captacao/prospects/${activeId}/supervisor-ct`, {
        action,
        ctScheduledAt: `${ctDate}T${ctTime || "09:00"}:00.000Z`,
        ctRoom: ctRoom.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setActiveId(null);
      await load();
      setFeedback({
        open: true,
        title: action === "confirm" ? "CT confirmado" : "Reagendamento enviado",
        message: "Captador será orientado pela ficha do prospect.",
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
        Nenhuma proposta de CT aguardando supervisor.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="space-y-3 rounded-xl border border-border/60 p-4 md:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-muted-foreground">
                {row.position ?? "—"}
                {row.proposedCtAt
                  ? ` · proposta ${formatDateDayMonYear(row.proposedCtAt)}`
                  : ""}
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
              onClick={() => openConfirm(row)}
            >
              <CalendarClock className="mr-1 h-4 w-4" />
              Revisar
            </Button>
          </div>
          {row.scout?.name ? (
            <p className="text-xs text-muted-foreground">Captador: {row.scout.name}</p>
          ) : null}
          {activeId === row.id ? (
            <div className="space-y-3 border-t border-border/40 pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label>Data confirmada</Label>
                  <Input
                    type="date"
                    value={ctDate}
                    onChange={(e) => setCtDate(e.target.value)}
                    className="min-h-[44px] text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={ctTime}
                    onChange={(e) => setCtTime(e.target.value)}
                    className="min-h-[44px] text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Sala / local CT</Label>
                <Input
                  value={ctRoom}
                  onChange={(e) => setCtRoom(e.target.value)}
                  placeholder="Ex.: Campo 2"
                  className="min-h-[44px]"
                />
              </div>
              <div className="grid gap-1">
                <Label>Observações</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                <Button
                  type="button"
                  className="min-h-[44px] flex-1"
                  disabled={saving}
                  onClick={() => void submit("confirm")}
                >
                  Confirmar CT
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] flex-1"
                  disabled={saving}
                  onClick={() => void submit("reschedule")}
                >
                  Pedir reagendamento
                </Button>
              </div>
            </div>
          ) : null}
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link href={`/dashboard/futebol/captacao/prospects/${row.id}?tenantId=${row.tenantId}`}>
              Ver ficha
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
