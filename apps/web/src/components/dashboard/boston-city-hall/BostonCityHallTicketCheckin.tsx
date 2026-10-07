"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
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
  EventTicketingEventListItem,
} from "@/types/boston-city-hall";
import { EVENT_TICKET_CHECKIN_RESULT_LABEL } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

const RESULT_STYLE: Record<string, string> = {
  accepted: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  already_used: "border-amber-500/50 bg-amber-500/10 text-amber-100",
  cancelled: "border-red-500/50 bg-red-500/10 text-red-200",
  invalid: "border-zinc-500/50 bg-zinc-500/10 text-zinc-200",
  wrong_event: "border-violet-500/50 bg-violet-500/10 text-violet-200",
};

export function BostonCityHallTicketCheckin() {
  const [events, setEvents] = useState<EventTicketingEventListItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [stationLabel, setStationLabel] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<EventTicketCheckinResponse | null>(null);
  const [recent, setRecent] = useState<EventTicketCheckinRecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const focusScan = useCallback(() => {
    window.requestAnimationFrame(() => scanRef.current?.focus());
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events");
      const list = Array.isArray(res.data) ? res.data : [];
      setEvents(list);
      if (list.length === 1) setEventId(list[0]!.id);
    })();
  }, []);

  const loadRecent = useCallback(async (ev: string) => {
    if (!ev) {
      setRecent([]);
      return;
    }
    setLoadingRecent(true);
    try {
      const res = await api.get<EventTicketCheckinRecentItem[]>(
        `/boston-city-hall/ticketing/checkins/recent?eventId=${encodeURIComponent(ev)}&limit=30`,
      );
      setRecent(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent(eventId);
  }, [eventId, loadRecent]);

  const submitScan = async (raw: string) => {
    const input = raw.trim();
    if (!eventId) return;
    if (!input || processing) return;

    setProcessing(true);
    try {
      const body: { eventId: string; credential?: string; ticketCode?: string; stationLabel?: string } =
        {
          eventId,
          stationLabel: stationLabel.trim() || undefined,
        };
      if (/^BCH-/i.test(input)) body.ticketCode = input;
      else body.credential = input;

      const res = await api.post<EventTicketCheckinResponse>("/boston-city-hall/ticketing/checkin", body);
      setLastResult(res.data);
      await loadRecent(eventId);
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
    focusScan();
  }, [focusScan, eventId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Evento</Label>
              <NativeSelectField
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Selecione o evento…"
                options={events.map((ev) => ({ value: ev.id, label: ev.name }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Estação / scanner</Label>
              <Input
                value={stationLabel}
                onChange={(e) => setStationLabel(e.target.value)}
                placeholder="Ex.: Entrada principal"
                className="text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Leitura QR / código</Label>
            <Input
              ref={scanRef}
              value={scanValue}
              disabled={!eventId || processing}
              autoComplete="off"
              spellCheck={false}
              className="min-h-[52px] text-lg text-foreground"
              placeholder={eventId ? "Aponte o scanner e leia…" : "Selecione um evento primeiro"}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitScan(scanValue);
                }
              }}
            />
          </div>

          {processing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando…
            </div>
          ) : null}

          {lastResult ? (
            <div
              className={cn(
                "rounded-lg border p-4 space-y-2",
                RESULT_STYLE[lastResult.result] ?? RESULT_STYLE.invalid,
              )}
            >
              <p className="text-lg font-bold tracking-wide">
                {EVENT_TICKET_CHECKIN_RESULT_LABEL[lastResult.result] ?? lastResult.result}
              </p>
              {lastResult.ticket ? (
                <>
                  <p className="font-mono text-sm">{lastResult.ticket.ticketCode}</p>
                  <p className="text-sm">
                    {lastResult.ticket.ticketTypeName}
                    {lastResult.ticket.lotName ? ` · ${lastResult.ticket.lotName}` : ""}
                  </p>
                  <p className="text-sm">{lastResult.ticket.holderName}</p>
                  {lastResult.ticket.tableName || lastResult.ticket.seatLabel ? (
                    <p className="text-sm">
                      {lastResult.ticket.tableName ? `Mesa: ${lastResult.ticket.tableName}` : ""}
                      {lastResult.ticket.seatLabel ? ` · Assento: ${lastResult.ticket.seatLabel}` : ""}
                    </p>
                  ) : null}
                  {lastResult.ticket.usedAt ? (
                    <p className="text-xs opacity-90">
                      Utilizado em: {new Date(lastResult.ticket.usedAt).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                </>
              ) : null}
              <p className="text-xs opacity-80">
                {new Date(lastResult.scannedAt).toLocaleString("pt-BR")}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 font-medium">Últimas leituras</p>
          {loadingRecent ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma leitura neste evento.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Titular</TableHead>
                    <TableHead>Horário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium">
                        {EVENT_TICKET_CHECKIN_RESULT_LABEL[r.result] ?? r.result}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.ticketCode ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.ticketTypeName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.holderName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
