"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BchEventSelectField } from "@/components/dashboard/boston-city-hall/BchEventSelectField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EventTicketCheckinRecentItem,
  EventTicketCheckinResponse,
} from "@/types/boston-city-hall";
import { EVENT_TICKET_CHECKIN_RESULT_LABEL } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";

const RESULT_STYLE: Record<string, string> = {
  accepted: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  already_used: "border-amber-500/50 bg-amber-500/10 text-amber-100",
  cancelled: "border-red-500/50 bg-red-500/10 text-red-200",
  invalid: "border-zinc-500/50 bg-zinc-500/10 text-zinc-200",
  wrong_event: "border-violet-500/50 bg-violet-500/10 text-violet-200",
};

type CheckinStation = { id: string; name: string; location: string | null; active: boolean };
type CheckinSession = {
  id: string;
  status: string;
  station: CheckinStation;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
};
type CheckinSummary = { issued: number; accepted: number; duplicate: number; rejected: number };

export function BostonCityHallTicketCheckin({ fixedEventId }: { fixedEventId?: string } = {}) {
  const binding = useBchHubEventBinding();
  const {
    events,
    eventId: boundEventId,
    setEventId,
    loading: loadingEvents,
    error: eventsError,
    reload: reloadEvents,
  } = binding;
  const eventId = fixedEventId ?? boundEventId;

  const [stations, setStations] = useState<CheckinStation[]>([]);
  const [session, setSession] = useState<CheckinSession | null>(null);
  const [summary, setSummary] = useState<CheckinSummary | null>(null);
  const [newStationName, setNewStationName] = useState("");
  const [newStationLocation, setNewStationLocation] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<EventTicketCheckinResponse | null>(null);
  const [recent, setRecent] = useState<EventTicketCheckinRecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [manualQ, setManualQ] = useState("");
  const [manualHits, setManualHits] = useState<{ id: string; label: string; ticketCode: string }[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraLoopRef = useRef<number | null>(null);

  const focusScan = useCallback(() => {
    window.requestAnimationFrame(() => scanRef.current?.focus());
  }, []);

  const loadSummary = useCallback(async (ev: string) => {
    if (!ev) return;
    try {
      const res = await api.get<CheckinSummary>(
        `/boston-city-hall/events/${encodeURIComponent(ev)}/checkin/summary`,
      );
      setSummary(res.data);
    } catch {
      setSummary(null);
    }
  }, []);

  const loadStations = useCallback(async (ev: string) => {
    if (!ev) {
      setStations([]);
      return;
    }
    const res = await api.get<CheckinStation[]>(
      `/boston-city-hall/events/${encodeURIComponent(ev)}/checkin/stations`,
    );
    setStations(Array.isArray(res.data) ? res.data.filter((s) => s.active) : []);
  }, []);

  const loadSession = useCallback(async (ev: string) => {
    if (!ev) {
      setSession(null);
      return;
    }
    try {
      const res = await api.get<CheckinSession | null>(
        `/boston-city-hall/events/${encodeURIComponent(ev)}/checkin/sessions/active`,
      );
      setSession(res.data ?? null);
    } catch {
      setSession(null);
    }
  }, []);

  const loadRecent = useCallback(async (ev: string) => {
    if (!ev) {
      setRecent([]);
      return;
    }
    setLoadingRecent(true);
    try {
      const res = await api.get<EventTicketCheckinRecentItem[]>(
        `/boston-city-hall/ticketing/checkins/recent?eventId=${encodeURIComponent(ev)}&limit=20`,
      );
      setRecent(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;
    void loadStations(eventId);
    void loadSession(eventId);
    void loadSummary(eventId);
    void loadRecent(eventId);
  }, [eventId, loadStations, loadSession, loadSummary, loadRecent]);

  useEffect(() => {
    if (!eventId) return;
    const id = window.setInterval(() => void loadSummary(eventId), 8000);
    return () => window.clearInterval(id);
  }, [eventId, loadSummary]);

  useEffect(() => {
    focusScan();
  }, [focusScan, eventId, session?.id]);

  useEffect(() => {
    if (!eventId || manualQ.trim().length < 2) {
      setManualHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .get<{ id: string; label: string; ticketCode: string }[]>(
          `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/tickets/search?q=${encodeURIComponent(manualQ.trim())}`,
        )
        .then((r) => setManualHits(Array.isArray(r.data) ? r.data : []));
    }, 300);
    return () => window.clearTimeout(t);
  }, [eventId, manualQ]);

  const createStation = async () => {
    if (!eventId || !newStationName.trim()) return;
    await api.post(`/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/stations`, {
      name: newStationName.trim(),
      location: newStationLocation.trim() || null,
    });
    setNewStationName("");
    setNewStationLocation("");
    await loadStations(eventId);
  };

  const openSession = async () => {
    if (!eventId || !selectedStationId) return;
    const res = await api.post<CheckinSession>(
      `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/sessions/open`,
      { stationId: selectedStationId },
    );
    setSession(res.data);
    focusScan();
  };

  const closeSession = async () => {
    if (!eventId || !session) return;
    await api.post(
      `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/sessions/${session.id}/close`,
      {},
    );
    setSession(null);
    await loadSummary(eventId);
  };

  const submitScan = async (raw: string) => {
    const input = raw.trim();
    if (!eventId || !input || processing) return;

    setProcessing(true);
    try {
      let res: { data: EventTicketCheckinResponse };
      if (session?.id) {
        const body: { credential?: string; ticketCode?: string } = {};
        if (/^BCH-/i.test(input)) body.ticketCode = input;
        else body.credential = input;
        res = await api.post<EventTicketCheckinResponse>(
          `/boston-city-hall/events/${encodeURIComponent(eventId)}/checkin/sessions/${session.id}/scan`,
          body,
        );
      } else {
        const body: { eventId: string; credential?: string; ticketCode?: string } = { eventId };
        if (/^BCH-/i.test(input)) body.ticketCode = input;
        else body.credential = input;
        res = await api.post<EventTicketCheckinResponse>("/boston-city-hall/ticketing/checkin", body);
      }
      setLastResult(res.data);
      setRecent((prev) => [
        {
          id: res.data.checkinId || `local-${Date.now()}`,
          result: res.data.result,
          ticketCode: res.data.ticket?.ticketCode ?? null,
          ticketTypeName: res.data.ticket?.ticketTypeName ?? null,
          holderName: res.data.ticket?.holderName ?? null,
          stationLabel: session?.station.name ?? null,
          createdAt: res.data.scannedAt,
        },
        ...prev.slice(0, 19),
      ]);
      void loadSummary(eventId);
      if (session) {
        setSession((s) =>
          s
            ? {
                ...s,
                acceptedCount:
                  s.acceptedCount + (res.data.result === "accepted" ? 1 : 0),
                duplicateCount:
                  s.duplicateCount + (res.data.result === "already_used" ? 1 : 0),
                rejectedCount:
                  s.rejectedCount +
                  (["invalid", "cancelled", "wrong_event"].includes(res.data.result) ? 1 : 0),
              }
            : s,
        );
      }
    } catch {
      setLastResult({
        result: "invalid",
        checkinId: "",
        scannedAt: new Date().toISOString(),
        ticket: null,
      });
    } finally {
      setScanValue("");
      setProcessing(false);
      focusScan();
    }
  };

  useEffect(() => {
    if (!cameraOn || !session?.id) return;
    let stream: MediaStream | null = null;
    let lastScan = 0;
    const start = async () => {
      if (!("BarcodeDetector" in window)) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new (window as unknown as {
          BarcodeDetector: new (o: { formats: string[] }) => {
            detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        }).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            cameraLoopRef.current = window.requestAnimationFrame(() => void tick());
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw && Date.now() - lastScan > 1500) {
              lastScan = Date.now();
              await submitScan(raw);
            }
          } catch {
            /* ignore */
          }
          cameraLoopRef.current = window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setCameraOn(false);
      }
    };
    void start();
    return () => {
      if (cameraLoopRef.current) cancelAnimationFrame(cameraLoopRef.current);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [cameraOn, session?.id, processing]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {!fixedEventId && (eventsError || (!loadingEvents && events.length === 0)) ? (
        <BchEventListDiagnostics
          error={eventsError}
          eventCount={events.length}
          onRetry={() => void reloadEvents()}
        />
      ) : null}

      {!fixedEventId ? (
        <div className="max-w-md">
          <Label className="text-xs">Evento</Label>
          <BchEventSelectField events={events} value={eventId} onChange={setEventId} />
        </div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Emitidos", value: summary.issued },
            { label: "Entradas", value: summary.accepted },
            { label: "Duplicadas", value: summary.duplicate },
            { label: "Rejeitadas", value: summary.rejected },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-slate-800/80 px-3 py-2 text-center">
              <p className="text-xs text-slate-400">{k.label}</p>
              <p className="text-lg font-semibold text-slate-100">{k.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-200">Estação e sessão</p>
        {session ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Sessão aberta · <strong>{session.station.name}</strong>
              {session.station.location ? ` · ${session.station.location}` : ""}
            </span>
            <Button type="button" size="sm" variant="outline" className="min-h-[36px]" onClick={() => void closeSession()}>
              Encerrar sessão
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[120px] flex-1 space-y-1">
              <Label className="text-xs">Nova estação</Label>
              <Input
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                className="h-9 text-foreground"
                placeholder="Nome"
              />
            </div>
            <div className="min-w-[120px] flex-1 space-y-1">
              <Label className="text-xs">Local físico</Label>
              <Input
                value={newStationLocation}
                onChange={(e) => setNewStationLocation(e.target.value)}
                className="h-9 text-foreground"
                placeholder="Ex.: Entrada principal"
              />
            </div>
            <Button type="button" size="sm" className="min-h-[36px]" disabled={!eventId} onClick={() => void createStation()}>
              Criar estação
            </Button>
          </div>
        )}
        {!session && stations.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-48 space-y-1">
              <Label className="text-xs">Estação</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.location ? ` — ${s.location}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              className="min-h-[36px]"
              disabled={!selectedStationId}
              onClick={() => void openSession()}
            >
              Abrir sessão
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label>Leitura QR / código</Label>
          {session ? (
            <Button
              type="button"
              size="sm"
              variant={cameraOn ? "default" : "outline"}
              className="min-h-[36px]"
              onClick={() => setCameraOn((v) => !v)}
            >
              {cameraOn ? "Desligar câmera" : "Câmera (Android/tablet)"}
            </Button>
          ) : null}
        </div>
        {cameraOn ? (
          <video ref={videoRef} className="max-h-48 w-full max-w-md rounded-md bg-black object-cover" muted playsInline />
        ) : null}
        <Input
          ref={scanRef}
          value={scanValue}
          disabled={!eventId || processing}
          autoComplete="off"
          spellCheck={false}
          className="max-w-xl min-h-[52px] text-lg text-foreground"
          placeholder={eventId ? "Aponte o scanner e leia…" : "Selecione um evento"}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submitScan(scanValue);
            }
          }}
        />
        {processing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando…
          </div>
        ) : null}
        {lastResult ? (
          <div
            className={cn(
              "max-w-xl rounded-lg border p-4 space-y-2",
              RESULT_STYLE[lastResult.result] ?? RESULT_STYLE.invalid,
            )}
          >
            <p className="text-lg font-bold">
              {EVENT_TICKET_CHECKIN_RESULT_LABEL[lastResult.result] ?? lastResult.result}
            </p>
            {lastResult.ticket ? (
              <>
                <p className="font-mono text-sm">{lastResult.ticket.ticketCode}</p>
                <p className="text-sm">{lastResult.ticket.holderName}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-800/80 p-4 space-y-2">
        <p className="text-sm font-medium">Busca manual</p>
        <Input
          value={manualQ}
          onChange={(e) => setManualQ(e.target.value)}
          className="max-w-md text-foreground"
          placeholder="Código, titular, e-mail ou pedido"
        />
        {manualHits.length > 0 ? (
          <ul className="max-h-36 overflow-y-auto rounded border border-slate-700 text-sm">
            {manualHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-slate-800/60"
                  onClick={() => void submitScan(h.ticketCode)}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-800/80 p-4">
        <p className="mb-3 text-sm font-medium">Últimas leituras</p>
        {loadingRecent ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma leitura neste evento.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resultado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Horário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">
                    {EVENT_TICKET_CHECKIN_RESULT_LABEL[r.result] ?? r.result}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.ticketCode ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.holderName ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
