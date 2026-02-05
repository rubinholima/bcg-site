"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TenantKind } from "@/types/tenant-kind";

interface EmpresasFiltersProps {
  kinds: TenantKind[];
  currentTipo: string | null;
  currentQ: string | null;
}

export function EmpresasFilters({
  kinds,
  currentTipo,
  currentQ,
}: EmpresasFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [qInput, setQInput] = useState(currentQ ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQInput(currentQ ?? "");
  }, [currentQ]);

  const updateParams = useCallback(
    (updates: { tipo?: string | null; q?: string | null }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (updates.tipo !== undefined) {
        if (updates.tipo == null || updates.tipo === "") next.delete("tipo");
        else next.set("tipo", updates.tipo);
      }
      if (updates.q !== undefined) {
        if (updates.q == null || updates.q === "") next.delete("q");
        else next.set("q", updates.q);
      }
      router.push(`/dashboard/empresas?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleQChange = (value: string) => {
    setQInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value.trim() || null });
    }, 300);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filtros
      </span>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="filtro-tipo" className="text-xs">
            Tipo
          </Label>
          <Select
            value={currentTipo ?? "all"}
            onValueChange={(v) => updateParams({ tipo: v === "all" ? null : v })}
          >
            <SelectTrigger id="filtro-tipo" className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {kinds.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filtro-busca" className="text-xs">
            Buscar (nome ou slug)
          </Label>
          <Input
            id="filtro-busca"
            type="search"
            placeholder="Nome ou slug..."
            className="w-[200px]"
            value={qInput}
            onChange={(e) => handleQChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
