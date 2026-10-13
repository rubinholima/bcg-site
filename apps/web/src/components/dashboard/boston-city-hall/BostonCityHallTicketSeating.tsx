"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import type { EventTicketingEventListItem } from "@/types/boston-city-hall";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { BchEventSelectField } from "@/components/dashboard/boston-city-hall/BchEventSelectField";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  section: string | null;
  active: boolean;
};

type SeatRow = {
  id: string;
  seatLabel: string;
  tableId: string | null;
  table?: { name: string } | null;
};

export function BostonCityHallTicketSeating() {
  const {
    events,
    eventId,
    setEventId,
    loading: loadingEvents,
    error: eventsError,
    reload: reloadEventsList,
  } = useBchHubEventBinding();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("8");
  const [seatLabel, setSeatLabel] = useState("");
  const [assignTicketId, setAssignTicketId] = useState("");
  const [assignTableId, setAssignTableId] = useState("");
  const [assignSeatId, setAssignSeatId] = useState("");
  const [loading, setLoading] = useState(false);

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
      tableId: assignTableId || undefined,
    });
    setSeatLabel("");
    await reload();
  };

  const assign = async () => {
    if (!assignTicketId.trim()) return;
    await api.patch(`/boston-city-hall/ticketing/tickets/${assignTicketId.trim()}/seating`, {
      tableId: assignTableId || null,
      seatId: assignSeatId || null,
    });
    setAssignTicketId("");
  };

  return (
    <div className="space-y-4">
      {eventsError || (!loadingEvents && events.length === 0) ? (
        <BchEventListDiagnostics
          error={eventsError}
          eventCount={events.length}
          onRetry={() => void reloadEventsList()}
        />
      ) : null}
      <BchEventSelectField events={events} value={eventId} onChange={setEventId} placeholder="Evento…" />

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label>Nova mesa</Label>
            <Input value={tableName} onChange={(e) => setTableName(e.target.value)} className="text-foreground" />
          </div>
          <div className="space-y-1">
            <Label>Capacidade</Label>
            <Input value={tableCapacity} onChange={(e) => setTableCapacity(e.target.value)} className="text-foreground" />
          </div>
          <Button type="button" disabled={!eventId} onClick={() => void createTable()}>
            Criar mesa
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Novo assento</Label>
            <Input value={seatLabel} onChange={(e) => setSeatLabel(e.target.value)} className="text-foreground" />
          </div>
          <div className="space-y-1">
            <Label>Mesa (opcional)</Label>
            <NativeSelectField
              value={assignTableId}
              onChange={(e) => setAssignTableId(e.target.value)}
              placeholder="—"
              options={tables.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <Button type="button" disabled={!eventId} onClick={() => void createSeat()}>
            Criar assento
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="font-medium">Atribuir mesa/assento ao ingresso</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="ID do ingresso"
              value={assignTicketId}
              onChange={(e) => setAssignTicketId(e.target.value)}
              className="text-foreground"
            />
            <NativeSelectField
              value={assignTableId}
              onChange={(e) => setAssignTableId(e.target.value)}
              placeholder="Mesa"
              options={tables.map((t) => ({ value: t.id, label: t.name }))}
            />
            <NativeSelectField
              value={assignSeatId}
              onChange={(e) => setAssignSeatId(e.target.value)}
              placeholder="Assento"
              options={seats.map((s) => ({ value: s.id, label: s.seatLabel }))}
            />
          </div>
          <Button type="button" variant="outline" onClick={() => void assign()}>
            Salvar atribuição
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mesa</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Seção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.capacity}</TableCell>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {seats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.seatLabel}</TableCell>
                  <TableCell>{s.table?.name ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
