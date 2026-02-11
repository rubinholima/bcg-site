"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TiposFilters({ currentQ }: { currentQ: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [qInput, setQInput] = useState(currentQ ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQInput(currentQ ?? "");
  }, [currentQ]);

  const handleQChange = (value: string) => {
    setQInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (!value.trim()) next.delete("q");
      else next.set("q", value.trim());
      router.push(`/dashboard/cadastros/tipos?${next.toString()}`);
    }, 300);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filtros
      </span>
      <div className="space-y-2">
        <Label htmlFor="filtro-tipos-busca" className="text-xs">
          Buscar por nome
        </Label>
        <Input
          id="filtro-tipos-busca"
          type="search"
          placeholder="Nome do tipo..."
          className="w-[220px]"
          value={qInput}
          onChange={(e) => handleQChange(e.target.value)}
        />
      </div>
    </div>
  );
}
