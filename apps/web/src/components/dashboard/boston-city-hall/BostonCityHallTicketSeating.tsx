"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { BchEventSelectField } from "@/components/dashboard/boston-city-hall/BchEventSelectField";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  section: string | null;
  active: boolean;
  occupiedCount?: number;
  availableCapacity?: number;
};

type SeatRow = {
  id: string;
  seatLabel: string;
  tableId: string | null;
  table?: { name: string } | null;
  occupied?: boolean;
  ticketCode?: string | null;
};

type TicketHit = {
  id: string;
  label: string;
  ticketCode: string;
  holderName: string;
  status: string;
};

export function BostonCityHallTicketSeating({ fixedEventId }: { fixedEventId?: string } = {}) {
  const binding = useBchHubEventBinding();
  const {
    events,
    eventId: boundEventId,
    setEventId,
    loading: loadingEvents,
    error: eventsError,
    reload: reloadEventsList,
  } = binding;
  const eventId = fixedEventId ?? boundEventId;
  const [tables, setTables] = useState<TableRow[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("8");
  const [seatLabel, setSeatLabel] = useState("");
  const [seatTableId, setSeatTableId] = useState("");
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketHits, setTicketHits] = useState<TicketHit[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [assignTableId, setAssignTableId] = useState("");
  const [assignSeatId, setAssignSeatId] = useState("");
  const [batchFrom, setBatchFrom] = useState("1");
  const [batchTo, setBatchTo] = useState("8");
  const [batchPrefix, setBatchPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const filteredSeats = useMemo(
    () => (assignTableId ? seats.filter((s) => s.tableId === assignTableId) : seats),
    [seats, assignTableId],
  );

  const reload = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        api.get<TableRow[]>(`/boston-city-hall/ticketing/tables?eventId=${encodeURIComponent(eventId)}`),
        api.get<SeatRow[]>(`/boston-city-hall/ticketing/seats?eventId=${encodeURIComponent(eventId)}`),
      ]);
      setTables(Array.isArray(tRes.data) ? tRes.data : []);
      setSeats(Array.isArray(sRes.data) ? sRes.data : []);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!eventId || ticketQuery.trim().length < 2) {
      setTicketHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .get<TicketHit[]>(
          `/boston-city-hall/ticketing/tickets/search?eventId=${encodeURIComponent(eventId)}&q=${encodeURIComponent(ticketQuery.trim())}`,
        )
        .then((res) => setTicketHits(Array.isArray(res.data) ? res.data : []))
        .catch(() => setTicketHits([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [eventId, ticketQuery]);

  const createTable = async () => {
    if (!eventId || !tableName.trim()) return;
    await api.post("/boston-city-hall/ticketing/tables", {
      eventId,
      name: tableName.trim(),
      capacity: Number.parseInt(tableCapacity, 10) || 8,
    });
    setTableName("");
    await reload();
  };

  const createSeat = async () => {
    if (!eventId || !seatLabel.trim()) return;
    await api.post("/boston-city-hall/ticketing/seats", {
      eventId,
      seatLabel: seatLabel.trim(),
      tableId: seatTableId || undefined,
    });
    setSeatLabel("");
    await reload();
  };

  const createBatch = async () => {
    if (!eventId) return;
    try {
      await api.post("/boston-city-hall/ticketing/seats/batch", {
        eventId,
        tableId: seatTableId || null,
        prefix: batchPrefix,
        from: Number.parseInt(batchFrom, 10),
        to: Number.parseInt(batchTo, 10),
      });
      await reload();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível criar assentos em lote.",
        variant: "error",
      });
    }
  };

  const releaseAssignment = async () => {
    if (!selectedTicketId) return;
    try {
      await api.delete(`/boston-city-hall/ticketing/tickets/${selectedTicketId}/seating`);
      setSelectedTicketId("");
      setTicketQuery("");
      setFeedback({ title: "Liberado", message: "Mesa/assento removidos do ingresso.", variant: "success" });
      await reload();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível liberar.",
        variant: "error",
      });
    }
  };

  const assign = async () => {
    if (!selectedTicketId) return;
    try {
      await api.patch(`/boston-city-hall/ticketing/tickets/${selectedTicketId}/seating`, {
        tableId: assignTableId || null,
        seatId: assignSeatId || null,
      });
      setTicketQuery("");
      setSelectedTicketId("");
      setFeedback({
        title: "Atribuição salva",
        message: "Mesa/assento vinculados ao ingresso.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar a atribuição.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-4">
      {!fixedEventId && (eventsError || (!loadingEvents && events.length === 0)) ? (
        <BchEventListDiagnostics
          error={eventsError}
          eventCount={events.length}
          onRetry={() => void reloadEventsList()}
        />
      ) : null}
      {!fixedEventId ? (
        <BchEventSelectField events={events} value={eventId} onChange={setEventId} placeholder="Evento…" />
      ) : null}

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-4">
        <p className="mb-3 text-sm font-medium text-slate-200">Nova mesa</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={tableName} onChange={(e) => setTableName(e.target.value)} className="h-9 text-foreground" />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Capacidade</Label>
            <Input
              value={tableCapacity}
              onChange={(e) => setTableCapacity(e.target.value)}
              className="h-9 text-foreground"
            />
          </div>
          <Button type="button" size="sm" className="min-h-[36px]" disabled={!eventId} onClick={() => void createTable()}>
            Criar mesa
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-4">
        <p className="mb-3 text-sm font-medium text-slate-200">Novo assento</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[120px] flex-1 space-y-1">
            <Label className="text-xs">Identificação</Label>
            <Input value={seatLabel} onChange={(e) => setSeatLabel(e.target.value)} className="h-9 text-foreground" />
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs">Mesa (opcional)</Label>
            <NativeSelectField
              value={seatTableId}
              onChange={(e) => setSeatTableId(e.target.value)}
              placeholder="—"
              options={tables.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <Button type="button" size="sm" className="min-h-[36px]" disabled={!eventId} onClick={() => void createSeat()}>
            Criar assento
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-800/60 pt-3">
          <div className="w-16 space-y-1">
            <Label className="text-xs">De</Label>
            <Input value={batchFrom} onChange={(e) => setBatchFrom(e.target.value)} className="h-9 text-foreground" />
          </div>
          <div className="w-16 space-y-1">
            <Label className="text-xs">Até</Label>
            <Input value={batchTo} onChange={(e) => setBatchTo(e.target.value)} className="h-9 text-foreground" />
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-xs">Prefixo</Label>
            <Input value={batchPrefix} onChange={(e) => setBatchPrefix(e.target.value)} className="h-9 text-foreground" />
          </div>
          <Button type="button" size="sm" variant="outline" className="min-h-[36px]" onClick={() => void createBatch()}>
            Lote de assentos
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-4">
        <p className="mb-3 text-sm font-medium text-slate-200">Atribuir ao ingresso</p>
        <div className="space-y-2">
          <div className="max-w-md space-y-1">
            <Label className="text-xs">Buscar ingresso</Label>
            <Input
              value={ticketQuery}
              onChange={(e) => {
                setTicketQuery(e.target.value);
                setSelectedTicketId("");
              }}
              placeholder="Código, titular, e-mail ou pedido"
              className="h-9 text-foreground"
            />
          </div>
          {ticketHits.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-slate-800 text-sm">
              {ticketHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left hover:bg-slate-800/60 ${
                      selectedTicketId === h.id ? "bg-violet-500/15" : ""
                    }`}
                    onClick={() => {
                      setSelectedTicketId(h.id);
                      setTicketQuery(h.label);
                      setTicketHits([]);
                    }}
                  >
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40 space-y-1">
              <Label className="text-xs">Mesa</Label>
              <NativeSelectField
                value={assignTableId}
                onChange={(e) => {
                  setAssignTableId(e.target.value);
                  setAssignSeatId("");
                }}
                placeholder="—"
                options={tables.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            <div className="w-40 space-y-1">
              <Label className="text-xs">Assento</Label>
              <NativeSelectField
                value={assignSeatId}
                onChange={(e) => setAssignSeatId(e.target.value)}
                placeholder="—"
                options={filteredSeats.map((s) => ({ value: s.id, label: s.seatLabel }))}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[36px]"
              disabled={!selectedTicketId}
              onClick={() => void assign()}
            >
              Salvar atribuição
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[36px]"
              disabled={!selectedTicketId}
              onClick={() => void releaseAssignment()}
            >
              Liberar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mesa</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Disponível</TableHead>
                <TableHead>Seção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.capacity}</TableCell>
                  <TableCell>{t.occupiedCount ?? "—"}</TableCell>
                  <TableCell>{t.availableCapacity ?? "—"}</TableCell>
                  <TableCell>{t.section ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assento</TableHead>
                <TableHead>Mesa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.seatLabel}</TableCell>
                  <TableCell>{s.table?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.occupied ? s.ticketCode ?? "Ocupado" : "Livre"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant={feedback?.variant ?? "success"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
