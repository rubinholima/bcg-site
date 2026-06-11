"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, ImageIcon, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEDIA_PLACEHOLDER_KEYS,
  MEDIA_PLACEHOLDER_SIZES,
  type MediaItem,
  type MediaPlaceholderSizeKey,
} from "@/lib/media-placeholders";
import { mediaKeyFromStoredUrl } from "@/lib/media-url";
import { displayNameFromUploadFilename } from "@/lib/upload-display-name";
import {
  filterMediaByKind,
  mediaFolderFromKey,
  type MediaFileKind,
} from "@/lib/media-file-kind";

const ALL_FOLDERS = "__all__";
const NONE_VALUE = "__none__";
const DEFAULT_FOLDER: MediaPlaceholderSizeKey = "bcg_tv";

const SKIP_FOLDERS = new Set<MediaPlaceholderSizeKey>([
  "hino",
  "imprensa_docs",
  "rh_documentos",
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

interface BcgTvS3FilePickerProps {
  kind: MediaFileKind;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

function itemMatchesValue(item: MediaItem, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (item.url === v) return true;
  const valueKey = mediaKeyFromStoredUrl(v);
  const itemKey = mediaKeyFromStoredUrl(item.url) ?? item.key;
  return Boolean(valueKey && itemKey && valueKey === itemKey);
}

function fileLabel(item: MediaItem): string {
  if (item.displayName?.trim()) return item.displayName.trim();
  return item.key.split("/").pop() ?? item.url;
}

function folderOptions(): Array<{ value: string; label: string }> {
  const opts = MEDIA_PLACEHOLDER_KEYS.filter((k) => !SKIP_FOLDERS.has(k)).map((k) => ({
    value: k,
    label: MEDIA_PLACEHOLDER_SIZES[k].label,
  }));
  return [{ value: ALL_FOLDERS, label: "Todas as pastas" }, ...opts];
}

export function BcgTvS3FilePicker({ kind, value, onChange, className }: BcgTvS3FilePickerProps) {
  const [folder, setFolder] = useState<string>(DEFAULT_FOLDER);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openNonce, setOpenNonce] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFolder =
    folder === ALL_FOLDERS || !MEDIA_PLACEHOLDER_KEYS.includes(folder as MediaPlaceholderSizeKey)
      ? DEFAULT_FOLDER
      : folder;

  useEffect(() => {
    if (!value.trim()) return;
    const key = mediaKeyFromStoredUrl(value);
    if (!key?.startsWith("media/")) return;
    const detected = mediaFolderFromKey(key);
    if (folder === ALL_FOLDERS || folder === detected) return;
    setFolder(detected);
  }, [value, folder]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    const qs =
      folder === ALL_FOLDERS
        ? "?all=1"
        : `?sizeKey=${encodeURIComponent(folder)}`;
    fetch(`/api/media${qs}`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaItem[] }) => {
        if (cancelled) return;
        const raw = (data.items ?? []).filter((item) => item.key.startsWith("media/"));
        setItems(filterMediaByKind(raw, kind));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folder, kind, openNonce]);

  const matchedItem = useMemo(
    () => items.find((item) => itemMatchesValue(item, value)),
    [items, value],
  );
  const orphanValue = value.trim() && !matchedItem ? value.trim() : null;
  const selectValue = matchedItem?.url ?? orphanValue ?? NONE_VALUE;

  const kindLabel = kind === "image" ? "Imagem" : "Vídeo";
  const KindIcon = kind === "image" ? ImageIcon : Film;

  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (kind === "image") {
      if (file.size > MAX_IMAGE_SIZE) {
        setUploadError("Imagem muito grande. Máximo 10 MB.");
        return;
      }
      const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"].includes(
        file.type,
      );
      if (!ok) {
        setUploadError("Formato inválido. Use PNG, JPG, WebP ou SVG.");
        return;
      }
    } else {
      if (file.size > MAX_VIDEO_SIZE) {
        setUploadError("Vídeo muito grande. Máximo 100 MB.");
        return;
      }
      const ok =
        file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
      if (!ok) {
        setUploadError("Formato inválido. Use MP4, WebM ou MOV.");
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", uploadFolder);
      const autoName = displayNameFromUploadFilename(file.name);
      if (autoName) formData.append("displayName", autoName);
      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
      const contentType = res.headers.get("content-type") ?? "";
      let data: { url?: string; message?: string; error?: string } = {};
      if (contentType.includes("application/json")) {
        data = (await res.json()) as typeof data;
      } else if (res.status === 413) {
        setUploadError("Arquivo grande demais para o servidor (limite de upload).");
        return;
      } else {
        setUploadError(`Erro HTTP ${res.status} ao enviar arquivo.`);
        return;
      }
      if (!res.ok) {
        setUploadError(data.message ?? data.error ?? "Erro ao enviar arquivo.");
        return;
      }
      if (data.url) {
        onChange(data.url);
        setFolder(uploadFolder);
        setOpenNonce((n) => n + 1);
      }
    } catch {
      setUploadError("Erro de conexão. Verifique se a API está rodando.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const accept =
    kind === "image"
      ? "image/png,image/jpeg,image/webp,image/svg+xml"
      : "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}

      <div className="space-y-2">
        <Label>Pasta no arquivo</Label>
        <Select
          value={folder}
          onValueChange={setFolder}
          disabled={loading || uploading}
        >
          <SelectTrigger className="min-h-[44px] text-foreground">
            <SelectValue placeholder="Escolher pasta…" />
          </SelectTrigger>
          <SelectContent className="z-[200] max-h-[min(16rem,50vh)]">
            {folderOptions().map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{kindLabel}</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={selectValue}
            onOpenChange={(open) => {
              if (open) setOpenNonce((n) => n + 1);
            }}
            onValueChange={(v) => onChange(v === NONE_VALUE ? "" : v)}
            disabled={loading || uploading}
          >
            <SelectTrigger className="min-h-[44px] min-w-0 flex-1 text-foreground">
              <SelectValue
                placeholder={
                  loading
                    ? "Carregando arquivos…"
                    : `Escolher ${kind === "image" ? "imagem" : "vídeo"}…`
                }
              />
            </SelectTrigger>
            <SelectContent className="z-[200] max-h-[min(20rem,60vh)]">
              <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>
              {orphanValue ? (
                <SelectItem value={orphanValue}>
                  <span className="truncate">{fileLabel({ key: orphanValue, url: orphanValue, size: 0, lastModified: "" })} (atual)</span>
                </SelectItem>
              ) : null}
              {items.map((item) => (
                <SelectItem key={item.key} value={item.url}>
                  <span className="flex items-center gap-2 truncate">
                    <KindIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {folder === ALL_FOLDERS ? (
                      <span>{mediaFolderFromKey(item.key)} / {fileLabel(item)}</span>
                    ) : (
                      fileLabel(item)
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value.trim() ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] shrink-0"
              onClick={() => onChange("")}
            >
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          ) : null}
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
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
              disabled={loading || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Enviando…" : kind === "image" ? "Enviar imagem" : "Enviar vídeo"}
            </Button>
          </>
        </div>
        {!loading && items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum {kind === "image" ? "arquivo de imagem" : "vídeo"} nesta pasta — escolha outra pasta ou use{" "}
            <strong>{kind === "image" ? "Enviar imagem" : "Enviar vídeo"}</strong>.
            {folder !== uploadFolder ? (
              <> Novos uploads vão para <strong>{MEDIA_PLACEHOLDER_SIZES[uploadFolder as MediaPlaceholderSizeKey]?.label ?? uploadFolder}</strong>.</>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            1) Escolha a pasta → 2) Escolha o arquivo já salvo, ou envie um novo
            {folder === ALL_FOLDERS ? ` (upload em ${MEDIA_PLACEHOLDER_SIZES.bcg_tv.label})` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
