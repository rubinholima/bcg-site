"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X, Music } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MediaItem } from "@/lib/media-placeholders";
import { mediaKeyFromStoredUrl } from "@/lib/media-url";
import { displayNameFromUploadFilename } from "@/lib/upload-display-name";

interface AudioMediaPickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

const NONE_VALUE = "__none__";
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const AUDIO_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/m4a,.mp3,.wav,.m4a";

function itemMatchesValue(item: MediaItem, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (item.url === v) return true;
  const valueKey = mediaKeyFromStoredUrl(v);
  const itemKey = mediaKeyFromStoredUrl(item.url) ?? item.key;
  return Boolean(valueKey && itemKey && valueKey === itemKey);
}

function labelForItem(item: MediaItem): string {
  if (item.displayName?.trim()) return item.displayName.trim();
  return item.key.split("/").pop() ?? item.url;
}

export function AudioMediaPicker({
  value,
  onChange,
  label = "Áudio do hino (MP3)",
  className,
  placeholder = "Escolher da pasta hino…",
}: AudioMediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openNonce, setOpenNonce] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    fetch("/api/media?sizeKey=hino", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaItem[] }) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openNonce]);

  const validItems = items.filter((item) => item.url?.trim());
  const matchedItem = validItems.find((item) => itemMatchesValue(item, value));
  const orphanValue = value?.trim() && !matchedItem ? value.trim() : null;
  const selectValue = matchedItem?.url ?? orphanValue ?? NONE_VALUE;

  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (file.size > MAX_AUDIO_SIZE) {
      setUploadError("Arquivo muito grande. Máximo 15 MB.");
      return;
    }
    const ok =
      file.type.startsWith("audio/") ||
      /\.(mp3|wav|m4a)$/i.test(file.name);
    if (!ok) {
      setUploadError("Formato inválido. Use MP3, WAV ou M4A.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", "hino");
      const autoName = displayNameFromUploadFilename(file.name);
      if (autoName) formData.append("displayName", autoName);
      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (!res.ok) {
        setUploadError(data?.message ?? data?.error ?? "Erro ao enviar áudio.");
        return;
      }
      if (data?.url) {
        onChange(data.url);
        setOpenNonce((n) => n + 1);
      }
    } catch {
      setUploadError("Erro de conexão. Verifique se a API está rodando.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {label ? <Label className="text-muted-foreground">{label}</Label> : null}
      <div className="mt-1 flex flex-col gap-2">
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
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
              <SelectValue placeholder={loading ? "Carregando…" : placeholder} />
            </SelectTrigger>
            <SelectContent className="z-[200] max-h-[min(20rem,60vh)]">
              <SelectItem value={NONE_VALUE}>Nenhum áudio</SelectItem>
              {orphanValue ? (
                <SelectItem value={orphanValue}>
                  <span className="truncate">{labelForItem({ key: orphanValue, url: orphanValue, size: 0, lastModified: "" })} (atual)</span>
                </SelectItem>
              ) : null}
              {validItems.map((item) => (
                <SelectItem key={item.key} value={item.url}>
                  <span className="flex items-center gap-2 truncate">
                    <Music className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {labelForItem(item)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value?.trim() ? (
            <Button type="button" variant="outline" size="sm" className="min-h-[44px] shrink-0" onClick={() => onChange("")}>
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          ) : null}
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
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
              {uploading ? "Enviando…" : "Enviar MP3"}
            </Button>
          </>
        </div>
        <p className="text-xs text-muted-foreground">MP3, WAV ou M4A — até 15 MB. Salvo em media/hino/ no S3.</p>
      </div>
    </div>
  );
}
