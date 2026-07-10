"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  MEDIA_PLACEHOLDER_SIZES,
  type MediaItem,
  type MediaPlaceholderSizeKey,
} from "@/lib/media-placeholders";
import { mediaKeyFromStoredUrl } from "@/lib/media-url";
import { api } from "@/lib/api";
import { displayNameFromUploadFilename } from "@/lib/upload-display-name";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

const NATIVE_SELECT_CLASS =
  "min-h-[44px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function validatePickerImageFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "Arquivo muito grande. Máximo 10 MB.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "heic" || ext === "heif") {
    return "Foto HEIC do iPhone não é suportada. Use JPG ou PNG.";
  }
  const allowedExt = ["png", "jpg", "jpeg", "webp", "svg"];
  if ((!file.type || file.type === "application/octet-stream") && allowedExt.includes(ext)) return null;
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return null;
  return "Formato inválido. Use PNG, JPG, WebP ou SVG.";
}

interface MediaPickerProps {
  value: string;
  onChange: (url: string) => void;
  /** Tamanho do placeholder para filtrar a lista (hero, card, section_bg, etc.). */
  sizeKey: MediaPlaceholderSizeKey;
  /** Se true, lista imagens de todas as pastas (não só sizeKey). */
  allowAllFolders?: boolean;
  /** @deprecated Não exibe mais link externo — mantido só por compatibilidade de props. */
  uploadFolderHint?: MediaPlaceholderSizeKey;
  /** Quando sizeKey é galeria_clubes, slug do clube para subpasta (media/galeria_clubes/{slug}/). */
  galeriaSlug?: string | null;
  /** Se "logos", lista apenas a pasta de logos (empresas/clubes). Ignora sizeKey. */
  folder?: "logos" | "all";
  placeholder?: string;
  label?: string;
  className?: string;
  refreshTrigger?: unknown;
  hideEmptyFolderHint?: boolean;
  allowUpload?: boolean;
  /** Exibe dica de formatos/tamanho de arquivo. Padrão: true — detalhes no Manual → Depto Futebol. */
  showUploadHint?: boolean;
  /** Exibe botão para remover a imagem selecionada. Padrão: true. */
  allowClear?: boolean;
  /** Desabilita seletor (ex.: durante upload). */
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const NONE_VALUE = "__none__";

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split("/").pop() ?? url;
  } catch {
    return url;
  }
}

function itemMatchesValue(item: MediaItem, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (item.url === v) return true;
  const valueKey = mediaKeyFromStoredUrl(v);
  const itemKey = mediaKeyFromStoredUrl(item.url) ?? item.key;
  return Boolean(valueKey && itemKey && valueKey === itemKey);
}

function itemOptionLabel(item: MediaItem, showFolder: boolean): string {
  if (item.displayName?.trim()) return item.displayName.trim();
  const parts = item.key.split("/");
  const file = parts.pop() ?? item.key;
  const folder = parts.slice(1).join("/") || parts[0] || "";
  const shortFile = file.length > 28 ? `${file.slice(0, 24)}…` : file;
  if (showFolder && folder) return `${folder} / ${shortFile}`;
  return shortFile;
}

function selectedValueLabel(value: string, matched?: MediaItem): string {
  if (matched) return itemOptionLabel(matched, false);
  const key = mediaKeyFromStoredUrl(value);
  if (key) {
    const file = key.split("/").pop() ?? key;
    return `${file} (atual)`;
  }
  return `${filenameFromUrl(value)} (atual)`;
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
  galeriaSlug,
  refreshTrigger,
  allowUpload = folder !== "logos",
  allowClear = true,
  showUploadHint = true,
  hideEmptyFolderHint = false,
  disabled = false,
}: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    queueMicrotask(() => {
      setLoading(true);
      setLoadError(null);
    });
    fetch(`/api/media${qs}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          throw new Error(body.message ?? body.error ?? `Erro ao listar mídia (${res.status})`);
        }
        return res.json() as Promise<{ items: MediaItem[] }>;
      })
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
      .catch((err: unknown) => {
        if (!cancelled) {
          setItems([]);
          setLoadError(
            err instanceof Error ? err.message : "Não foi possível carregar a biblioteca de imagens.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sizeKey, allowAllFolders, folder, galeriaSlug, refreshTrigger]);

  const dimensions = folder === "logos" ? "Logo" : MEDIA_PLACEHOLDER_SIZES[sizeKey]?.dimensions ?? "—";
  const validItems = items.filter((item) => item.url?.trim());
  const matchedItem = validItems.find((item) => itemMatchesValue(item, value));
  const valueInList = Boolean(matchedItem);
  const orphanValue = value?.trim() && !valueInList ? value.trim() : null;
  const selectValue = matchedItem?.url ?? orphanValue ?? NONE_VALUE;
  const showFolderInLabels = allowAllFolders || folder === "logos";
  const hasSelection = Boolean(value?.trim());

  const handleUpload = async (file: File) => {
    setUploadError(null);
    const validationError = validatePickerImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", sizeKey);
      if (sizeKey === "galeria_clubes" && galeriaSlug?.trim()) {
        formData.append("slug", galeriaSlug.trim());
      }
      const autoName = displayNameFromUploadFilename(file.name);
      if (autoName) formData.append("displayName", autoName);
      const { data } = await api.postForm<{ url?: string }>("/media", formData);
      if (data?.url) {
        onChange(data.url);
      } else {
        setUploadError("Upload concluído sem URL. Tente novamente.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro de conexão. Verifique se a API está rodando.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {label ? (
        <Label className="text-muted-foreground">
          {label}
          {dimensions !== "—" && folder !== "logos" ? (
            <span className="ml-1 font-normal text-muted-foreground">({dimensions})</span>
          ) : null}
        </Label>
      ) : null}
      <div className="mt-1 flex flex-col gap-2">
        {loadError ? <p className="text-xs text-destructive">{loadError}</p> : null}
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* select nativo: funciona dentro do <dialog> modal (Radix Select quebrava ao abrir) */}
          <select
            className={NATIVE_SELECT_CLASS}
            value={selectValue}
            disabled={uploading || disabled}
            onChange={(e) => onChange(e.target.value === NONE_VALUE ? "" : e.target.value)}
          >
            <option value={NONE_VALUE} disabled={loading && validItems.length === 0}>
              {loading && validItems.length === 0 ? "Carregando imagens…" : "Nenhuma (sem imagem)"}
            </option>
            {orphanValue ? (
              <option value={orphanValue}>{selectedValueLabel(orphanValue)}</option>
            ) : null}
            {validItems.map((item) => (
              <option key={item.key} value={item.url}>
                {itemOptionLabel(item, showFolderInLabels)}
              </option>
            ))}
          </select>
          {allowClear && hasSelection ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] shrink-0"
              disabled={uploading}
              title="Remover imagem"
              onClick={() => onChange("")}
            >
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          ) : null}
          {allowUpload ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="hidden"
                form=""
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] shrink-0"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando…" : "Enviar foto"}
              </Button>
            </>
          ) : null}
        </div>
        {allowUpload && showUploadHint ? (
          <p className="text-xs text-muted-foreground">
            PNG, JPG ou WebP — até 10 MB. O sistema otimiza automaticamente (WebP, tamanho máximo por pasta).
          </p>
        ) : null}
        {!hideEmptyFolderHint && !loading && !loadError && validItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma imagem nesta pasta ainda — use <strong>Enviar foto</strong>.
          </p>
        ) : null}
        {!loading && validItems.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {validItems.length} {validItems.length === 1 ? "imagem" : "imagens"} em{" "}
            <strong>{MEDIA_PLACEHOLDER_SIZES[sizeKey]?.label ?? sizeKey}</strong>
            {placeholder ? ` — pasta S3: media/${sizeKey}/` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
