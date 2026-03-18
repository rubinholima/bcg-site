"use client";

import { useState, useEffect } from "react";
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

export interface RoomOccupant {
  personId?: string;
  personName: string;
  personType: "player" | "staff";
}

export interface RoomAssignment {
  roomNumber: string;
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

export function RoomAssignmentTable({ tenantId, value, onChange, disabled }: RoomAssignmentTableProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<TechnicalStaffMember[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      api.get<Player[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<TechnicalStaffMember[]>(`/technical-staff?tenantId=${encodeURIComponent(tenantId)}`),
    ]).then(([pRes, sRes]) => {
      setPlayers(Array.isArray(pRes.data) ? pRes.data : []);
      setStaff(Array.isArray(sRes.data) ? sRes.data : []);
    }).catch(() => {
      setPlayers([]);
      setStaff([]);
    });
  }, [tenantId]);

  const allOptions = [
    ...players.map(buildPersonOption),
    ...staff.map(buildStaffOption),
  ];

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

  const setOccupant = (roomIndex: number, slotIndex: number, optionValue: string) => {
    const next = value.map((r, i) =>
      i === roomIndex ? { ...r, occupants: [...r.occupants] } : r
    );
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
    next[roomIndex].occupants = occ.slice(0, 3);
    onChange(next);
  };

  const getOccupantOption = (roomIndex: number, slotIndex: number): string => {
    const occ = value[roomIndex]?.occupants?.[slotIndex];
    if (!occ?.personId) return "none";
    return `${occ.personType}:${occ.personId}`;
  };

  /** Pessoas já atribuídas em outros quartos (excluindo o quarto atual) — 1 pessoa = 1 quarto */
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Quartos (até 3 pessoas por quarto)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRoom}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar quarto
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Nº quarto</TableHead>
              <TableHead>Ocupante 1</TableHead>
              <TableHead>Ocupante 2</TableHead>
              <TableHead>Ocupante 3</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Nenhum quarto. Clique em &quot;Adicionar quarto&quot;.
                </TableCell>
              </TableRow>
            ) : (
              value.map((room, roomIndex) => (
                <TableRow key={roomIndex}>
                  <TableCell>
                    <Input
                      placeholder="Ex: 101"
                      value={room.roomNumber}
                      onChange={(e) => setRoomNumber(roomIndex, e.target.value)}
                      disabled={disabled}
                      className="w-24"
                    />
                  </TableCell>
                  {[0, 1, 2].map((slotIndex) => (
                    <TableCell key={slotIndex}>
                      <Select
                        value={getOccupantOption(roomIndex, slotIndex)}
                        onValueChange={(v) => setOccupant(roomIndex, slotIndex, v)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="min-w-[140px]">
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
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRoom(roomIndex)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
