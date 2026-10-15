"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BchCheckinPairingPanel } from "@/components/dashboard/boston-city-hall/BchCheckinPairingPanel";
import { readCheckinPairing } from "@/components/dashboard/boston-city-hall/bch-checkin-pairing-store";
import {
  checkinStationDisplay,
  normalizeCheckinSession,
  type CheckinSessionDto,
} from "@/components/dashboard/boston-city-hall/bch-checkin-session";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_SECONDARY, BCH_CARD, BCH_INPUT, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";

const RESULT_STYLE: Record<string, string> = {
  accepted: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  already_used: "border-amber-500/50 bg-amber-500/10 text-amber-100",
  cancelled: "border-red-500/50 bg-red-500/10 text-red-200",
  invalid: "border-zinc-500/50 bg-zinc-500/10 text-zinc-200",
  wrong_event: "border-violet-500/50 bg-violet-500/10 text-violet-200",
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

  const eventLabel = useMemo(() => {
    if (!eventId) return "";
    const hit = events.find((e) => e.id === eventId);
    return hit?.name?.trim() || eventId;
  }, [eventId, events]);

  const [session, setSession] = useState<CheckinSessionDto | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [summary, setSummary] = useState<CheckinSummary | null>(null);
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

  const loadSession = useCallback(async (ev: string) => {
    if (!ev) {
      setSession(null);
      setSessionError(null);
      return;
    }
    setLoadingSession(true);
    setSessionError(null);
    try {
      const paired = readCheckinPairing(ev);
      const qs = paired?.stationId
        ? `?stationId=${encodeURIComponent(paired.stationId)}`
        : "";
      const res = await api.get<CheckinSessionDto | null>(
        `/boston-city-hall/events/${encodeURIComponent(ev)}/checkin/sessions/active${qs}`,
      );
      setSession(normalizeCheckinSession(res.data));
    } catch {
      setSession(null);
      setSessionError("Não foi possível carregar a sessão de check-in.");
    } finally {
      setLoadingSession(false);
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
    void loadSession(eventId);
    void loadSummary(eventId);
    void loadRecent(eventId);
  }, [eventId, loadSession, loadSummary, loadRecent]);

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
          stationLabel: session?.station ? checkinStationDisplay(session.station) : null,
          createdAt: res.data.scannedAt,
        },
        ...prev.slice(0, 19),
      ]);
      void loadSummary(eventId);
      if (session) {
        setSession((s) => {
          if (!s) return s;
          const accepted = s.acceptedCount ?? 0;
          const duplicate = s.duplicateCount ?? 0;
          const rejected = s.rejectedCount ?? 0;
          return {
            ...s,
            acceptedCount: accepted + (res.data.result === "accepted" ? 1 : 0),
            duplicateCount: duplicate + (res.data.result === "already_used" ? 1 : 0),
            rejectedCount:
              rejected + (["invalid", "cancelled", "wrong_event"].includes(res.data.result) ? 1 : 0),
          };
        });
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

  const sessionStationLine = session?.station ? checkinStationDisplay(session.station) : null;

  const kpiTiles = [
    ...(summary
      ? [
          { label: "Emitidos", value: summary.issued },
          { label: "Entradas (evento)", value: summary.accepted },
          { label: "Duplicadas", value: summary.duplicate },
          { label: "Rejeitadas", value: summary.rejected },
        ]
      : []),
    ...(session
      ? [
          { label: "Sessão · OK", value: session.acceptedCount ?? 0 },
          { label: "Sessão · dup.", value: session.duplicateCount ?? 0 },
          { label: "Sessão · rej.", value: session.rejectedCount ?? 0 },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      {!fixedEventId && (eventsError || (!loadingEvents && events.length === 0)) ? (
        <BchEventListDiagnostics
          error={eventsError}
          eventCount={events.length}
          onRetry={() => void reloadEvents()}
        />
      ) : null}

      {!fixedEventId ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md flex-1 space-y-1">
            <Label className="text-xs text-slate-400">Evento</Label>
            <BchEventSelectField events={events} value={eventId} onChange={setEventId} />
          </div>
          <Button asChild variant="outline" size="sm" className={cn("min-h-[40px] shrink-0", BCH_BTN_SECONDARY)}>
            <Link
              href={`${BCH_BASE}/ticketing?tab=checkout${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`}
            >
              Laboratório de venda
            </Link>
          </Button>
        </div>
      ) : null}

      {eventId ? (
        <BchCheckinPairingPanel
          eventId={eventId}
          session={session}
          onSessionChange={(s) => {
            setSession(s);
            if (s) void loadSummary(eventId);
          }}
          onPairedFocusScan={focusScan}
        />
      ) : null}

      {sessionError ? (
        <p className="text-xs text-red-300">{sessionError}</p>
      ) : loadingSession ? (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Carregando sessão…
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className={cn(BCH_CARD, "space-y-3")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Leitura QR / código</p>
              {session ? (
                <Button
                  type="button"
                  size="sm"
                  variant={cameraOn ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => setCameraOn((v) => !v)}
                >
                  {cameraOn ? "Desligar câmera" : "Câmera"}
                </Button>
              ) : null}
            </div>
            {cameraOn ? (
              <video
                ref={videoRef}
                className="max-h-52 w-full rounded-lg bg-black object-cover sm:max-w-lg"
                muted
                playsInline
              />
            ) : null}
            <Input
              ref={scanRef}
              value={scanValue}
              disabled={!eventId || processing}
              autoComplete="off"
              spellCheck={false}
              className="min-h-[52px] text-lg text-foreground sm:max-w-2xl"
              placeholder={
                !eventId
                  ? "Selecione um evento"
                  : session
                    ? "Aponte o scanner e leia…"
                    : "Abra uma sessão ou leia sem sessão (modo avulso)"
              }
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitScan(scanValue);
                }
              }}
            />
            {session && eventId ? (
              <p className="text-xs text-slate-500 sm:max-w-2xl">
                Leitor USB (NETUM): não precisa parear no sistema. Clique neste campo, escaneie o QR — o
                aparelho digita o código e confirma com Enter. As leituras entram nesta sessão (
                {sessionStationLine ?? "estação ativa"}).
              </p>
            ) : null}
            {processing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando…
              </div>
            ) : null}
            {lastResult ? (
              <div
                className={cn(
                  "rounded-lg border p-4 space-y-2 sm:max-w-2xl",
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
          </section>

          <section className={cn(BCH_CARD, "space-y-2")}>
            <p className="text-sm font-semibold text-slate-100">Busca manual</p>
            <Input
              value={manualQ}
              onChange={(e) => setManualQ(e.target.value)}
              className={cn("min-h-[44px] text-foreground sm:max-w-xl", BCH_INPUT)}
              placeholder="Código, titular, e-mail ou pedido"
              disabled={!eventId}
            />
            {manualQ.trim().length >= 2 && manualHits.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum ingresso encontrado.</p>
            ) : null}
            {manualHits.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-slate-700 text-sm sm:max-w-xl">
                {manualHits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2.5 text-left hover:bg-slate-800/60"
                      onClick={() => void submitScan(h.ticketCode)}
                    >
                      {h.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          {kpiTiles.length > 0 ? (
            <section className={cn(BCH_CARD, "space-y-3")}>
              <p className="text-sm font-semibold text-slate-100">Presença</p>
              <div className="grid grid-cols-2 gap-2">
                {kpiTiles.map((k) => (
                  <div key={k.label} className="rounded-lg border border-slate-800/80 px-2 py-2 text-center">
                    <p className="text-[10px] leading-tight text-slate-500">{k.label}</p>
                    <p className="text-lg font-semibold tabular-nums text-slate-100">{k.value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={cn(BCH_CARD, "space-y-2")}>
            <p className="text-sm font-semibold text-slate-100">Últimas leituras</p>
            {loadingRecent ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma leitura neste evento.</p>
            ) : (
              <div className={BCH_TABLE_WRAP}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="hidden sm:table-cell">Titular</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.slice(0, 12).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {EVENT_TICKET_CHECKIN_RESULT_LABEL[r.result] ?? r.result}
                        </TableCell>
                        <TableCell className="max-w-[88px] truncate font-mono text-xs">{r.ticketCode ?? "—"}</TableCell>
                        <TableCell className="hidden max-w-[120px] truncate text-sm sm:table-cell">
                          {r.holderName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
