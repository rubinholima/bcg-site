"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Radio, Unlink } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  clearCheckinPairing,
  readCheckinPairing,
  saveCheckinPairing,
} from "@/components/dashboard/boston-city-hall/bch-checkin-pairing-store";
import {
  checkinStationDisplay,
  normalizeCheckinSession,
  type CheckinSessionDto,
} from "@/components/dashboard/boston-city-hall/bch-checkin-session";
import { BCH_BTN_PRIMARY, BCH_BTN_SECONDARY, BCH_CARD, BCH_INPUT } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";

export type CheckinPortariaBoardItem = {
  station: {
    id: string;
    name: string;
    location: string | null;
    active: boolean;
    deviceLabel: string | null;
  };
  openSession: {
    id: string;
    deviceLabel: string | null;
    acceptedCount: number;
    duplicateCount: number;
    rejectedCount: number;
    openedAt: string;
    operatorLabel: string | null;
  } | null;
};

export function BchCheckinPairingPanel({
  eventId,
  session,
  onSessionChange,
  onPairedFocusScan,
}: {
  eventId: string;
  session: CheckinSessionDto | null;
  onSessionChange: (s: CheckinSessionDto | null) => void;
  onPairedFocusScan: () => void;
}) {
  const [board, setBoard] = useState<CheckinPortariaBoardItem[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [pairing, setPairing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const loadBoard = useCallback(async () => {
    if (!eventId) {
      setBoard([]);
      return;
    }
    setLoadingBoard(true);
    try {
      const res = await api.get<CheckinPortariaBoardItem[]>(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/portarias`,
      );
      setBoard(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBoard([]);
    } finally {
      setLoadingBoard(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!eventId) return;
    const stored = readCheckinPairing(eventId);
    if (stored) {
      setSelectedStationId(stored.stationId);
      setDeviceLabel(stored.deviceLabel);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const id = window.setInterval(() => void loadBoard(), 12_000);
    return () => window.clearInterval(id);
  }, [eventId, loadBoard]);

  const seedPortarias = async () => {
    if (!eventId) return;
    setSeeding(true);
    try {
      const res = await api.post<CheckinPortariaBoardItem[]>(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/portarias/seed-default`,
        {},
      );
      setBoard(Array.isArray(res.data) ? res.data : []);
      setFeedback({
        open: true,
        title: "Portarias prontas",
        message: "Portaria 1–4 criadas (as que faltavam). Selecione a desta máquina.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível criar as portarias.",
        variant: "error",
      });
    } finally {
      setSeeding(false);
    }
  };

  const pairAndOpen = async () => {
    if (!eventId || !selectedStationId) return;
    const label = deviceLabel.trim() || "Leitor USB";
    setPairing(true);
    try {
      const res = await api.post<CheckinSessionDto>(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/sessions/open`,
        { stationId: selectedStationId, deviceLabel: label },
      );
      const normalized = normalizeCheckinSession(res.data);
      saveCheckinPairing({
        eventId,
        stationId: selectedStationId,
        deviceLabel: label,
        sessionId: normalized?.id,
      });
      onSessionChange(normalized);
      await loadBoard();
      onPairedFocusScan();
      setFeedback({
        open: true,
        title: "Portaria pareada",
        message: "Sessão aberta nesta estação. Escaneie ingressos no campo abaixo.",
        variant: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível parear.";
      setFeedback({
        open: true,
        title: "Pareamento falhou",
        message: msg.includes("409") || msg.toLowerCase().includes("já existe")
          ? "Esta portaria já tem sessão aberta em outro computador. Encerre lá ou escolha outra portaria."
          : msg,
        variant: "error",
      });
    } finally {
      setPairing(false);
    }
  };

  const unpair = async () => {
    if (!eventId || !session) return;
    try {
      await api.post(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/sessions/${session.id}/close`,
        {},
      );
    } catch {
      /* encerra localmente mesmo se API falhar */
    }
    clearCheckinPairing(eventId);
    onSessionChange(null);
    await loadBoard();
  };

  const pairedStored = eventId ? readCheckinPairing(eventId) : null;
  const isThisMachinePaired =
    session && pairedStored && pairedStored.stationId === session.station?.id;

  return (
    <section className={cn(BCH_CARD, "space-y-4 border-sky-500/25")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-sky-100">
            <Radio className="h-4 w-4 shrink-0" aria-hidden />
            Pareamento de portaria e leitor
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Uma sessão por portaria. Cada computador/leitor NETUM escolhe sua portaria aqui.
          </p>
        </div>
        {board.length < 4 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("min-h-[40px] shrink-0", BCH_BTN_SECONDARY)}
            disabled={!eventId || seeding}
            onClick={() => void seedPortarias()}
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar portarias 1–4"}
          </Button>
        ) : null}
      </div>

      {loadingBoard && board.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : board.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma portaria cadastrada. Use o botão acima.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {board.map((item) => {
            const busy = Boolean(item.openSession);
            const selected = selectedStationId === item.station.id;
            const mine =
              isThisMachinePaired && session?.station?.id === item.station.id;
            return (
              <button
                key={item.station.id}
                type="button"
                disabled={busy && !mine}
                onClick={() => setSelectedStationId(item.station.id)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors min-h-[88px]",
                  selected ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/35" : "border-slate-800/80 bg-slate-950/40",
                  busy && !mine ? "cursor-not-allowed opacity-60" : "hover:border-sky-500/30",
                  mine ? "border-emerald-500/40 bg-emerald-500/5" : null,
                )}
              >
                <p className="text-sm font-semibold text-slate-100">{item.station.name}</p>
                <p className="text-[11px] text-slate-500">{item.station.location ?? "—"}</p>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wide">
                  {mine ? (
                    <span className="text-emerald-300">Esta máquina</span>
                  ) : busy ? (
                    <span className="text-amber-200/90">Em uso</span>
                  ) : (
                    <span className="text-slate-500">Disponível</span>
                  )}
                </p>
                {item.openSession ? (
                  <p className="mt-1 text-[10px] text-slate-500 truncate">
                    {item.openSession.deviceLabel ?? "Leitor"} · OK {item.openSession.acceptedCount}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {session && isThisMachinePaired ? (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-100">Pareado e operando</p>
            <p className="truncate text-xs text-slate-300">
              {checkinStationDisplay(session.station)} · {session.deviceLabel ?? pairedStored?.deviceLabel}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("min-h-[44px] gap-2 shrink-0", BCH_BTN_SECONDARY)}
            onClick={() => void unpair()}
          >
            <Unlink className="h-4 w-4" />
            Desparear
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 border-t border-slate-800/70 pt-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Identificador do leitor (NETUM)</Label>
              <Input
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                placeholder="Ex.: NETUM Saída 1"
                className={cn("min-h-[44px] text-foreground", BCH_INPUT)}
              />
            </div>
          </div>
          <Button
            type="button"
            className={cn("min-h-[44px] w-full md:w-auto", BCH_BTN_PRIMARY)}
            disabled={!eventId || !selectedStationId || pairing}
            onClick={() => void pairAndOpen()}
          >
            {pairing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parear portaria e abrir sessão"}
          </Button>
        </div>
      )}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </section>
  );
}
