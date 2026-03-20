"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { getPublicImageUrl } from "@/lib/media-url";
import { namesMatch } from "@/lib/names-match";
import { fetchVisitingTeamsMergedWithS3 } from "@/lib/visiting-teams-merge";

export type SelectWithCreateType = "championship" | "stadium" | "visiting-team";

interface BaseItem {
  id: string;
  name: string;
}

interface VisitingTeamItem extends BaseItem {
  logoUrl?: string | null;
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
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = API_MAP[type];
  const labels = LABEL_MAP[type];
  const isVisitingTeam = type === "visiting-team";

  const loadItems = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        if (!isVisitingTeam) {
          const { data } = await api.get<T[]>(config.list);
          setItems((data ?? []) as T[]);
          return;
        }
        const merged = await fetchVisitingTeamsMergedWithS3();
        setItems(merged as unknown as T[]);
      } catch {
        if (!opts?.silent) setItems([]);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [config.list, isVisitingTeam],
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadItems({ silent: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadItems]);

  const uploadLogoToMedia = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sizeKey", "external_logos");
    const res = await fetch("/api/media", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || "Erro ao enviar logo");
    }
    const data = (await res.json()) as { url?: string };
    if (!data?.url) throw new Error("Resposta sem URL");
    return data.url;
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      let logoUrl: string | undefined;
      if (isVisitingTeam && createLogoFile) {
        logoUrl = await uploadLogoToMedia(createLogoFile);
      }
      const body =
        type === "stadium"
          ? { name, city: "", address: "" }
          : isVisitingTeam
            ? { name, logoUrl: logoUrl ?? undefined }
            : { name };
      const { data } = await api.post<{ id: string; name: string; logoUrl?: string | null }>(
        config.create,
        body,
      );
      if (data?.id) {
        onChange(data.name, data.logoUrl ?? undefined);
        setCreateOpen(false);
        setCreateName("");
        setCreateLogoFile(null);
        setCreateLogoPreview(null);
        await loadItems({ silent: true });
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setCreateError("Selecione uma imagem (PNG, JPG, WebP ou SVG)");
        return;
      }
      setCreateLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setCreateLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setCreateLogoFile(null);
      setCreateLogoPreview(null);
    }
    setCreateError(null);
  };

  const resetCreateForm = () => {
    setCreateOpen(false);
    setCreateName("");
    setCreateLogoFile(null);
    setCreateLogoPreview(null);
    setCreateError(null);
    fileInputRef.current?.value && (fileInputRef.current.value = "");
  };

  const valueMatch = value?.trim();
  const selectedId =
    items.find((i) => namesMatch(i.name, valueMatch))?.id ?? (valueMatch ? "__custom__" : "__none__");

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
          onOpenChange={(open) => {
            if (open) void loadItems({ silent: true });
          }}
          onValueChange={(v) => {
            if (v === "__create__") {
              setCreateOpen(true);
            } else if (v === "__none__") {
              onChange("");
            } else if (v === "__custom__") {
              return;
            } else {
              const item = items.find((i) => i.id === v) as VisitingTeamItem | undefined;
              if (item) onChange(item.name, item.logoUrl ?? undefined);
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
            {valueMatch && !items.some((i) => namesMatch(i.name, valueMatch)) && (
              <SelectItem value="__custom__">
                {logoUrlProp ? (
                  <span className="flex items-center gap-2">
                    <img
                      src={getPublicImageUrl(logoUrlProp)}
                      alt=""
                      className="h-5 w-5 object-contain rounded shrink-0"
                    />
                    {valueMatch} (manual)
                  </span>
                ) : (
                  `${valueMatch} (manual)`
                )}
              </SelectItem>
            )}
            {items.map((item) => {
              const vt = item as VisitingTeamItem;
              return (
                <SelectItem key={item.id} value={item.id}>
                  {vt.logoUrl ? (
                    <span className="flex items-center gap-2">
                      <img
                        src={getPublicImageUrl(vt.logoUrl)}
                        alt=""
                        className="h-5 w-5 object-contain rounded shrink-0"
                      />
                      {item.name}
                    </span>
                  ) : (
                    item.name
                  )}
                </SelectItem>
              );
            })}
            <SelectItem value="__create__" className="text-primary font-medium">
              <Plus className="h-4 w-4 inline mr-1" />
              Cadastrar novo
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-4">{labels.modal}</h3>
            {createError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
                {createError}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">{labels.field} *</Label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex: Nome do time"
                  disabled={createLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              {isVisitingTeam && (
                <div className="space-y-2">
                  <Label>Logo (opcional)</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      disabled={createLoading}
                    />
                    {createLogoPreview && (
                      <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
                        <img
                          src={createLogoPreview}
                          alt="Preview"
                          className="h-12 w-12 object-contain rounded"
                        />
                        <span className="text-sm text-muted-foreground">
                          Logo selecionado
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCreateLogoFile(null);
                            setCreateLogoPreview(null);
                            fileInputRef.current?.value && (fileInputRef.current.value = "");
                          }}
                          disabled={createLoading}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP ou SVG. Será salvo na pasta de logos externos.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreate} disabled={createLoading || !createName.trim()}>
                {createLoading ? "Criando…" : "Criar"}
              </Button>
              <Button
                variant="outline"
                onClick={resetCreateForm}
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
