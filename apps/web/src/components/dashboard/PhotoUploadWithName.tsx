"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl, urlToMediaKey } from "@/lib/media-url";
import type { MediaPlaceholderSizeKey } from "@/lib/media-placeholders";

/** Pastas por departamento: medico, psicologia, comissao, jogadores, etc. */
const SIZE_KEY_TO_LABEL: Record<string, string> = {
  medico: "Depto Médico",
  psicologia: "Psicologia",
  comissao: "Comissão técnica",
  jogadores: "Jogadores",
};

interface PhotoUploadWithNameProps {
  /** Pasta no S3 (media/{sizeKey}/) — cada departamento sua pasta */
  sizeKey: MediaPlaceholderSizeKey;
  value: string;
  onChange: (url: string) => void;
  onPhotoKeyChange?: (key: string) => void;
  disabled?: boolean;
  placeholder?: string;
  urlPlaceholder?: string;
  namePlaceholder?: string;
}

export function PhotoUploadWithName({
  sizeKey,
  value,
  onChange,
  onPhotoKeyChange,
  disabled = false,
  placeholder = "Escolher imagem",
  urlPlaceholder = "Ou colar URL da foto",
  namePlaceholder = "Ex: foto-nome-do-profissional",
}: PhotoUploadWithNameProps) {
  const [photoDisplayName, setPhotoDisplayName] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const photoKey = value ? urlToMediaKey(value) : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadSuccess) return;
    const t = setTimeout(() => setUploadSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [uploadSuccess]);

  useEffect(() => {
    if (!value?.trim()) return;
    const key = urlToMediaKey(value);
    if (!key?.trim()) return;
    fetch(`/api/media?sizeKey=${encodeURIComponent(sizeKey)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: Array<{ key?: string; url?: string; displayName?: string | null }> }) => {
        const item = (d.items ?? []).find(
          (i) => i.key === key || (i.url ?? "").includes(value) || (i.key ?? "").includes(key)
        );
        if (item?.displayName) setPhotoDisplayName(item.displayName);
      })
      .catch(() => {});
  }, [value, sizeKey]);

  const handleSaveDisplayName = async () => {
    if (!photoKey?.trim() || photoDisplayName === undefined) return;
    try {
      await fetch("/api/media", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: photoKey, displayName: photoDisplayName.trim() || null }),
      });
      setPhotoRefreshKey((k) => k + 1);
    } catch {
      /* ignorar */
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", sizeKey);
      if (photoDisplayName?.trim()) {
        formData.append("displayName", photoDisplayName.trim());
      }
      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
      if (!res.ok) return;
      const data = (await res.json()) as { url?: string; key?: string };
      if (data?.url) {
        onChange(data.url);
        onPhotoKeyChange?.(data.key ?? photoKey);
        setUploadSuccess(true);
        setPhotoRefreshKey((k) => k + 1);
      }
    } finally {
      e.target.value = "";
    }
  };

  const folderLabel = SIZE_KEY_TO_LABEL[sizeKey] ?? sizeKey;

  return (
    <div className="space-y-2">
      {uploadSuccess && (
        <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {photoDisplayName?.trim()
            ? `Foto "${photoDisplayName.trim()}" enviada com sucesso para pasta ${folderLabel}!`
            : "Foto enviada com sucesso!"}
        </div>
      )}
      <div className="flex gap-4">
        <div className="h-24 w-24 rounded overflow-hidden bg-muted shrink-0">
          {value ? (
            <img src={getPublicImageUrl(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <MediaPicker
            sizeKey={sizeKey}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            refreshTrigger={photoRefreshKey}
            hideEmptyFolderHint
          />
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">Nome da foto (opcional)</Label>
            <Input
              placeholder={namePlaceholder}
              value={photoDisplayName}
              onChange={(e) => setPhotoDisplayName(e.target.value)}
              onBlur={handleSaveDisplayName}
              disabled={disabled}
              className="text-foreground h-9"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleUploadPhoto}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Enviar nova foto
          </Button>
          <Input
            placeholder={urlPlaceholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
