"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export type SelectWithCreateType = "championship" | "stadium" | "visiting-team";

interface BaseItem {
  id: string;
  name: string;
}

interface VisitingTeamItem extends BaseItem {
  logoUrl?: string;
}

interface SelectWithCreateProps<T extends BaseItem> {
  /** Valor atual (nome do item, ex: competitionName, venueName) ou para visiting-team: { name, logoUrl } */
  value: string;
  onChange: (name: string, logoUrl?: string) => void;
  type: SelectWithCreateType;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Para visiting-team: URL do logo atual */
  logoUrl?: string;
}

const API_MAP = {
  championship: { list: "/championships", create: "/championships", nameKey: "name" as const },
  stadium: { list: "/stadiums", create: "/stadiums", nameKey: "name" as const },
  "visiting-team": { list: "/visiting-teams", create: "/visiting-teams", nameKey: "name" as const },
} as const;

const LABEL_MAP = {
  championship: { modal: "Novo Campeonato", field: "Nome" },
  stadium: { modal: "Novo Estádio", field: "Nome" },
  "visiting-team": { modal: "Novo Time", field: "Nome" },
} as const;

export function SelectWithCreate<T extends BaseItem>({
  value,
  onChange,
  type,
  placeholder = "Selecione...",
  label,
  className,
  logoUrl: logoUrlProp,
}: SelectWithCreateProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const config = API_MAP[type];
  const labels = LABEL_MAP[type];

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<T[]>(config.list);
      setItems((data ?? []) as T[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [type]);

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const body = type === "stadium" ? { name, city: "", address: "" } : { name };
      const { data } = await api.post<{ id: string; name: string }>(config.create, body);
      if (data?.id) {
        const newItem = { id: data.id, name: data.name } as T;
        setItems((prev) => [...prev, newItem]);
        onChange(data.name);
        setCreateOpen(false);
        setCreateName("");
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setCreateLoading(false);
    }
  };

  const valueMatch = value?.trim();
  const selectedId = items.find((i) => i.name === valueMatch)?.id ?? (valueMatch ? "__custom__" : "__none__");

  return (
    <div className={className}>
      {label && (
        <Label className="text-muted-foreground">
          {label}
        </Label>
      )}
      <div className="flex gap-2 mt-1">
        <Select
          value={selectedId}
          onValueChange={(v) => {
            if (v === "__create__") {
              setCreateOpen(true);
            } else if (v === "__none__") {
              onChange("");
            } else if (v === "__custom__") {
              return;
            } else {
              const item = items.find((i) => i.id === v) as VisitingTeamItem | undefined;
              if (item) onChange(item.name, item.logoUrl);
            }
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Carregando…" : placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              {placeholder}
            </SelectItem>
            {valueMatch && !items.some((i) => i.name === valueMatch) && (
              <SelectItem value="__custom__">
                {valueMatch} (manual)
              </SelectItem>
            )}
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
            <SelectItem value="__create__" className="text-primary font-medium">
              <Plus className="h-4 w-4 inline mr-1" />
              Cadastrar novo
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-semibold text-lg mb-4">{labels.modal}</h3>
            {createError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
                {createError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">{labels.field} *</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Nome do item"
                disabled={createLoading}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreate} disabled={createLoading || !createName.trim()}>
                {createLoading ? "Criando…" : "Criar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateName("");
                  setCreateError(null);
                }}
                disabled={createLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
