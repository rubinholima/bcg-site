"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEDIA_PLACEHOLDER_SIZES,
  type MediaItem,
  type MediaPlaceholderSizeKey,
} from "@/lib/media-placeholders";

interface MediaPickerProps {
  value: string;
  onChange: (url: string) => void;
  /** Tamanho do placeholder para filtrar a lista (hero, card, section_bg, etc.). */
  sizeKey: MediaPlaceholderSizeKey;
  /** Se true, lista imagens de todas as pastas (não só sizeKey). Assim o que foi enviado em qualquer pasta aparece. */
  allowAllFolders?: boolean;
  /** Se "logos", lista apenas a pasta de logos (empresas/clubes). Ignora sizeKey. */
  folder?: "logos" | "all";
  placeholder?: string;
  label?: string;
  className?: string;
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split("/").pop() ?? url;
  } catch {
    return url;
  }
}

export function MediaPicker({
  value,
  onChange,
  sizeKey,
  allowAllFolders = false,
  folder = "all",
  placeholder = "Escolher da mídia…",
  label,
  className,
}: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const useLogosOnly = folder === "logos";
    const qs = useLogosOnly ? "?all=1" : allowAllFolders ? "" : `?sizeKey=${encodeURIComponent(sizeKey)}`;
    fetch(`/api/media${qs}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaItem[] }) => {
        const list = data.items ?? [];
        if (useLogosOnly) {
          return list.filter((item) => item.folder === "logos");
        }
        return list;
      })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [sizeKey, allowAllFolders, folder]);

  const dimensions = folder === "logos" ? "Logo" : MEDIA_PLACEHOLDER_SIZES[sizeKey]?.dimensions ?? "—";
  const validItems = items.filter((item) => item.url?.trim());
  const valueInList = validItems.some((item) => item.url === value);
  const displayValue = value?.trim() || "__none__";

  return (
    <div className={className}>
      {label && (
        <Label className="text-muted-foreground">
          {label}
          {dimensions !== "—" && folder !== "logos" && (
            <span className="ml-1 font-normal text-muted-foreground">
              ({dimensions})
            </span>
          )}
        </Label>
      )}
      <div className="flex gap-2 mt-1">
        <Select value={displayValue} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Carregando…" : placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              {placeholder}
            </SelectItem>
            {value?.trim() && !valueInList && (
              <SelectItem value={value}>
                <span className="truncate block max-w-[280px]" title={value}>
                  {filenameFromUrl(value)} (selecionado)
                </span>
              </SelectItem>
            )}
            {validItems.map((item) => (
              <SelectItem key={item.key} value={item.url}>
                <span className="truncate block max-w-[280px]" title={item.url}>
                  {item.displayName?.trim() || item.key.split("/").pop() || item.url}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
