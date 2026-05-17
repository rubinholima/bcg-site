"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
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
  /** Quando o link "Subir para mídia" é exibido, redireciona para esta pasta (ex: backgrounds). */
  uploadFolderHint?: MediaPlaceholderSizeKey;
  /** Quando sizeKey é galeria_clubes, slug do clube para subpasta (media/galeria_clubes/{slug}/). */
  galeriaSlug?: string | null;
  /** Se "logos", lista apenas a pasta de logos (empresas/clubes). Ignora sizeKey. */
  folder?: "logos" | "all";
  placeholder?: string;
  label?: string;
  className?: string;
  /** Quando muda, recarrega a lista (ex: incrementar após upload para o novo aparecer no dropdown). */
  refreshTrigger?: unknown;
  /** Oculta o link "Subir para mídia" quando a pasta está vazia. Use em cadastros que têm botão "Enviar nova foto" — o upload é direto. */
  hideEmptyFolderHint?: boolean;
}

const NATIVE_SELECT_CLASS =
  "flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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
  uploadFolderHint,
  galeriaSlug,
  refreshTrigger,
  hideEmptyFolderHint = false,
}: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNonce, setOpenNonce] = useState(0);

  useEffect(() => {
    const useLogosOnly = folder === "logos";
    let qs: string;
    if (sizeKey === "galeria_clubes" && galeriaSlug?.trim()) {
      qs = `?sizeKey=galeria_clubes&slug=${encodeURIComponent(galeriaSlug.trim())}`;
    } else if (useLogosOnly) {
      qs = "?all=1";
    } else if (allowAllFolders) {
      qs = "";
    } else {
      qs = `?sizeKey=${encodeURIComponent(sizeKey)}`;
    }
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    fetch(`/api/media${qs}`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaItem[] }) => {
        if (cancelled) return [];
        const list = data.items ?? [];
        if (useLogosOnly) {
          return list.filter((item) => item.folder === "logos");
        }
        return list;
      })
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sizeKey, allowAllFolders, folder, galeriaSlug, refreshTrigger, openNonce]);

  const dimensions = folder === "logos" ? "Logo" : MEDIA_PLACEHOLDER_SIZES[sizeKey]?.dimensions ?? "—";
  const validItems = items.filter((item) => item.url?.trim());
  const valueInList = validItems.some((item) => item.url === value);
  const nativeValue =
    value?.trim() && !valueInList ? value.trim() : value?.trim() || "__none__";

  const handleNativeChange = (v: string) => {
    onChange(v === "__none__" ? "" : v);
  };

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
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex gap-2">
        <select
          className={NATIVE_SELECT_CLASS}
          aria-label={label || placeholder}
          disabled={loading}
          value={nativeValue}
          onFocus={() => setOpenNonce((n) => n + 1)}
          onChange={(e) => handleNativeChange(e.target.value)}
        >
          <option value="__none__">{loading ? "Carregando…" : placeholder}</option>
          {value?.trim() && !valueInList && (
            <option value={value.trim()}>
              {filenameFromUrl(value)} (selecionado)
            </option>
          )}
          {validItems.map((item) => (
            <option key={item.key} value={item.url}>
              {item.displayName?.trim() || item.key.split("/").pop() || item.url}
            </option>
          ))}
        </select>
        </div>
        {!loading && validItems.length === 0 && folder !== "logos" && !hideEmptyFolderHint && (
          <Link
            href={
              uploadFolderHint
                ? `/dashboard/midia?folder=${encodeURIComponent(uploadFolderHint)}${galeriaSlug?.trim() ? `&slug=${encodeURIComponent(galeriaSlug.trim())}` : ""}`
                : "/dashboard/midia"
            }
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Nenhuma imagem nesta pasta. Subir para mídia →
          </Link>
        )}
      </div>
    </div>
  );
}
