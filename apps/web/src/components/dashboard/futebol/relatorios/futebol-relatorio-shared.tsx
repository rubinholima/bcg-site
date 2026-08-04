"use client";

import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { isFootballKind } from "@/lib/home-data";
import { formatTravelCategoriesDisplay } from "@/lib/travel-categories-utils";
import { formatDateDayMonYear } from "@/lib/format-date";
import { dateKeyInBrazil } from "@/lib/brazil-time";
import type { PrintPageSize } from "@/lib/futebol-relatorios.types";

export interface FutebolRelatorioTenant {
  id: string;
  name: string;
  kind?: { name?: string };
  categories?: string[] | null;
}

export interface FutebolRelatorioTravel {
  id: string;
  tenantId: string;
  tenant?: { name: string };
  matchDate: string;
  opponentName?: string | null;
  championshipName?: string | null;
  category?: string | null;
  categories?: string[] | null;
  status: string;
  isHomeMatch?: boolean;
  externalId?: string | null;
  _count?: { participants?: number };
}

export function isClubForRelatorio(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (!isFootballKind(kindName)) return false;
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

export function formatTravelLabel(t: FutebolRelatorioTravel): string {
  const date = formatDateDayMonYear(t.matchDate);
  const vs = t.opponentName ? ` vs ${t.opponentName}` : "";
  const cat = formatTravelCategoriesDisplay(t.category, t.categories);
  const club = t.tenant?.name ? `${t.tenant.name} · ` : "";
  const side = t.isHomeMatch ? " · Casa" : t.isHomeMatch === false ? " · Fora" : "";
  return `${club}${date}${vs}${side}${cat ? ` (${cat})` : ""}`;
}

export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PageSizeSelect({
  value,
  onChange,
}: {
  value: PrintPageSize;
  onChange: (v: PrintPageSize) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">Formato de impressão</Label>
      <Select value={value} onValueChange={(v) => onChange(v as PrintPageSize)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="A4">A4</SelectItem>
          <SelectItem value="Letter">Carta (Letter)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function useFutebolRelatorioTenants() {
  const [tenants, setTenants] = useState<FutebolRelatorioTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<FutebolRelatorioTenant[]>("/tenants?clubsOnly=1")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setTenants(list.filter((t) => isClubForRelatorio(t.kind?.name)));
      })
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, []);

  return { tenants, loading };
}

export function useFutebolRelatorioTravels(tenantId: string) {
  const [travels, setTravels] = useState<FutebolRelatorioTravel[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setTravels([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<FutebolRelatorioTravel[]>(
        `/futebol-relatorios/viagens?tenantId=${encodeURIComponent(id)}`,
      );
      const today = dateKeyInBrazil(new Date());
      const list = (Array.isArray(data) ? data : []).filter(
        (t) => dateKeyInBrazil(t.matchDate) >= today,
      );
      list.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      setTravels(list);
    } catch {
      setTravels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tenantId);
  }, [tenantId, load]);

  return { travels, loading };
}
