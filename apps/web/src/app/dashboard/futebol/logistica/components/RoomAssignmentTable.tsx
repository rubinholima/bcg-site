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

export interface RoomOccupant {
  personId?: string;
  personName: string;
  personType: "player" | "staff";
}

export interface RoomAssignment {
  roomNumber: string;
  roomTypeId?: string;
  roomTypeName?: string;
  occupants: RoomOccupant[];
}

interface Player {
  id: string;
  name: string;
  category?: string | null;
}

interface TechnicalStaffMember {
  id: string;
  name: string;
  role?: string | null;
}

interface RoomAssignmentTableProps {
  tenantId: string;
  value: RoomAssignment[];
  onChange: (rooms: RoomAssignment[]) => void;
  disabled?: boolean;
}

function buildPersonOption(player: Player) {
  return { value: `player:${player.id}`, label: player.name, type: "player" as const, id: player.id };
}

function buildStaffOption(staff: TechnicalStaffMember) {
  return { value: `staff:${staff.id}`, label: staff.name, type: "staff" as const, id: staff.id };
}

function slotCountForRoom(room: RoomAssignment, roomTypes: { id: string; capacity?: number }[]): number {
  const rt = roomTypes.find((r) => r.id === room.roomTypeId);
  const cap = rt?.capacity ?? 3;
  return Math.min(Math.max(cap, 1), 8);
}

export function RoomAssignmentTable({ tenantId, value, onChange, disabled }: RoomAssignmentTableProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<TechnicalStaffMember[]>([]);
  const { roomTypes, loading: loadingLookups } = useLogisticaCadastrosLookups();

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      api.get<Player[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<TechnicalStaffMember[]>(`/technical-staff?tenantId=${encodeURIComponent(tenantId)}`),
    ])
      .then(([pRes, sRes]) => {
        setPlayers(Array.isArray(pRes.data) ? pRes.data : []);
        setStaff(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch(() => {
        setPlayers([]);
        setStaff([]);
      });
  }, [tenantId]);

  const allOptions = useMemo(
    () => [...players.map(buildPersonOption), ...staff.map(buildStaffOption)],
    [players, staff],
  );

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
      const opt = allOptions.find((o) => o.value === optionValue);
      occ[slotIndex] = {
        personId: id,
        personName: opt?.label ?? "",
        personType: (type as "player" | "staff") ?? "player",
      };
    }
    next[roomIndex].occupants = occ.slice(0, maxSlots);
    onChange(next);
  };

  const getOccupantOption = (roomIndex: number, slotIndex: number): string => {
    const occ = value[roomIndex]?.occupants?.[slotIndex];
    if (!occ?.personId) return "none";
    return `${occ.personType}:${occ.personId}`;
  };

  const usedInOtherRooms = (roomIndex: number) => {
    const used = new Set<string>();
    value.forEach((r, ri) => {
      if (ri === roomIndex) return;
      r.occupants.forEach((o) => {
        if (o.personId) used.add(`${o.personType}:${o.personId}`);
      });
    });
    return used;
  };

  const availableOptions = (roomIndex: number, slotIndex: number) => {
    const currentVal = getOccupantOption(roomIndex, slotIndex);
    const used = usedInOtherRooms(roomIndex);
    return allOptions.filter((o) => {
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
                            disabled={disabled}
                          >
                            <SelectTrigger className="min-w-[140px] min-h-[44px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {availableOptions(roomIndex, slotIndex).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                  {opt.type === "staff" ? " (comissão)" : ""}
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
