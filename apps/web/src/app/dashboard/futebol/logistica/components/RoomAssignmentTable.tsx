"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLogisticaCadastrosLookups } from "@/hooks/useLogisticaCadastrosLookups";
import {
  buildTravelRoomParticipantOptions,
  mergePreservedRoomOccupantOptions,
  type TravelParticipantForRoom,
  type TravelRoomParticipantOption,
} from "@/lib/travel-room-participant-options.util";

export interface RoomOccupant {
  personId?: string;
  personName: string;
  personType: "player" | "staff" | "guest";
}

export interface RoomAssignment {
  roomNumber: string;
  roomTypeId?: string;
  roomTypeName?: string;
  occupants: RoomOccupant[];
}

interface RoomAssignmentTableProps {
  tenantId: string;
  travelId?: string | null;
  value: RoomAssignment[];
  onChange: (rooms: RoomAssignment[]) => void;
  disabled?: boolean;
}

function slotCountForRoom(room: RoomAssignment, roomTypes: { id: string; capacity?: number }[]): number {
  const rt = roomTypes.find((r) => r.id === room.roomTypeId);
  const cap = rt?.capacity ?? 3;
  return Math.min(Math.max(cap, 1), 8);
}

function occupantTypeLabel(type: TravelRoomParticipantOption["type"]): string {
  if (type === "staff") return " (comissão)";
  if (type === "guest") return " (convidado)";
  return "";
}

export function RoomAssignmentTable({
  tenantId: _tenantId,
  travelId,
  value,
  onChange,
  disabled,
}: RoomAssignmentTableProps) {
  const [tripParticipants, setTripParticipants] = useState<TravelRoomParticipantOption[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const { roomTypes, loading: loadingLookups } = useLogisticaCadastrosLookups();

  useEffect(() => {
    if (!travelId) {
      setTripParticipants([]);
      return;
    }

    let cancelled = false;
    setLoadingParticipants(true);
    api
      .get<TravelParticipantForRoom[]>(`/logistica/${encodeURIComponent(travelId)}/participants`)
      .then((res) => {
        if (cancelled) return;
        const participants = Array.isArray(res.data) ? res.data : [];
        setTripParticipants(buildTravelRoomParticipantOptions(participants));
      })
      .catch(() => {
        if (!cancelled) setTripParticipants([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingParticipants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [travelId]);

  const participantOptions = useMemo(() => {
    const existingOccupants = value.flatMap((room) => room.occupants ?? []);
    return mergePreservedRoomOccupantOptions(tripParticipants, existingOccupants);
  }, [tripParticipants, value]);

  const scopeMessage = useMemo(() => {
    if (!travelId) {
      return "Salve a viagem e inclua participantes na convocação para atribuir quartos.";
    }
    if (!loadingParticipants && participantOptions.length === 0) {
      return "Nenhum participante foi incluído nesta viagem.";
    }
    return null;
  }, [travelId, loadingParticipants, participantOptions.length]);

  const addRoom = () => {
    onChange([...value, { roomNumber: "", occupants: [] }]);
  };

  const removeRoom = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const setRoomNumber = (index: number, roomNumber: string) => {
    const next = [...value];
    next[index] = { ...next[index], roomNumber };
    onChange(next);
  };

  const setRoomType = (index: number, roomTypeId: string) => {
    const next = [...value];
    const rt = roomTypes.find((r) => r.id === roomTypeId);
    const maxSlots = roomTypeId && rt?.capacity ? Math.min(rt.capacity, 8) : 3;
    next[index] = {
      ...next[index],
      roomTypeId: roomTypeId || undefined,
      roomTypeName: rt?.name,
      occupants: (next[index]?.occupants ?? []).slice(0, maxSlots),
    };
    onChange(next);
  };

  const setOccupant = (roomIndex: number, slotIndex: number, optionValue: string) => {
    const next = value.map((r, i) =>
      i === roomIndex ? { ...r, occupants: [...r.occupants] } : r,
    );
    const maxSlots = slotCountForRoom(next[roomIndex], roomTypes);
    const occ = next[roomIndex].occupants;
    while (occ.length <= slotIndex) occ.push({ personName: "", personType: "player" });
    if (optionValue === "none" || !optionValue) {
      occ[slotIndex] = { personName: "", personType: "player" };
    } else {
      const [type, id] = optionValue.split(":");
      const opt = participantOptions.find((o) => o.value === optionValue);
      occ[slotIndex] = {
        personId: id,
        personName: opt?.label ?? "",
        personType: (type as RoomOccupant["personType"]) ?? "player",
      };
    }
    next[roomIndex].occupants = occ.slice(0, maxSlots);
    onChange(next);
  };

  const getOccupantOption = (roomIndex: number, slotIndex: number): string => {
    const occ = value[roomIndex]?.occupants?.[slotIndex];
    if (!occ?.personId && !occ?.personName?.trim()) return "none";
    if (occ.personId) return `${occ.personType}:${occ.personId}`;
    return `${occ.personType}:${occ.personName.trim()}`;
  };

  const usedInOtherRooms = (roomIndex: number) => {
    const used = new Set<string>();
    value.forEach((r, ri) => {
      if (ri === roomIndex) return;
      r.occupants.forEach((o) => {
        const key = o.personId
          ? `${o.personType}:${o.personId}`
          : o.personName?.trim()
            ? `${o.personType}:${o.personName.trim()}`
            : null;
        if (key) used.add(key);
      });
    });
    return used;
  };

  const availableOptions = (roomIndex: number, slotIndex: number) => {
    const currentVal = getOccupantOption(roomIndex, slotIndex);
    const used = usedInOtherRooms(roomIndex);
    return participantOptions.filter((o) => {
      if (o.value === currentVal) return true;
      return !used.has(`${o.type}:${o.id}`);
    });
  };

  const maxSlotsGlobal = useMemo(() => {
    return Math.max(3, ...value.map((r) => slotCountForRoom(r, roomTypes)));
  }, [value, roomTypes]);

  const slotHeaders = Array.from({ length: maxSlotsGlobal }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Quartos (categoria de acomodação + ocupantes)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRoom} disabled={disabled} className="min-h-[44px]">
          <Plus className="mr-1 h-4 w-4" />
          Adicionar quarto
        </Button>
      </div>
      {scopeMessage ? (
        <p className="text-sm text-muted-foreground">{scopeMessage}</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Nº quarto</TableHead>
              <TableHead className="min-w-[140px]">Acomodação</TableHead>
              {slotHeaders.map((i) => (
                <TableHead key={i}>Ocupante {i + 1}</TableHead>
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3 + maxSlotsGlobal} className="py-6 text-center text-muted-foreground">
                  Nenhum quarto. Clique em &quot;Adicionar quarto&quot;.
                </TableCell>
              </TableRow>
            ) : (
              value.map((room, roomIndex) => {
                const slots = slotCountForRoom(room, roomTypes);
                return (
                  <TableRow key={roomIndex}>
                    <TableCell>
                      <Input
                        placeholder="Ex: 101"
                        value={room.roomNumber}
                        onChange={(e) => setRoomNumber(roomIndex, e.target.value)}
                        disabled={disabled}
                        className="w-24 min-h-[44px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={room.roomTypeId ?? "none"}
                        onValueChange={(v) => setRoomType(roomIndex, v === "none" ? "" : v)}
                        disabled={disabled || loadingLookups}
                      >
                        <SelectTrigger className="min-w-[130px] min-h-[44px]">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {roomTypes.map((rt) => (
                            <SelectItem key={rt.id} value={rt.id}>
                              {rt.name}
                              {rt.capacity ? ` (${rt.capacity})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {slotHeaders.map((slotIndex) => (
                      <TableCell key={slotIndex}>
                        {slotIndex < slots ? (
                          <Select
                            value={getOccupantOption(roomIndex, slotIndex)}
                            onValueChange={(v) => setOccupant(roomIndex, slotIndex, v)}
                            disabled={disabled || loadingParticipants || !travelId}
                          >
                            <SelectTrigger className="min-w-[140px] min-h-[44px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {availableOptions(roomIndex, slotIndex).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                  {occupantTypeLabel(opt.type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => removeRoom(roomIndex)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
