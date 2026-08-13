"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";

const SIZE_KEY = "futebol_treinadores" as const;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm";

interface Props {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  label?: string;
}

export function JogosMediaPicker({ value, onChange, disabled, label = "Arquivo" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Arquivo muito grande. Máximo 50 MB.");
      return;
    }

    const allowed =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      /\.(pdf|png|jpe?g|webp|mp4|webm)$/i.test(file.name);
    if (!allowed) {
      setUploadError("Use PDF, imagem ou vídeo (MP4/WebM).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", SIZE_KEY);
      if (file.name.trim()) formData.append("displayName", file.name.trim());

      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (!res.ok || !data?.url) {
        setUploadError(data?.message ?? data?.error ?? "Erro ao enviar arquivo.");
        return;
      }
      onChange(data.url);
      setRefreshKey((k) => k + 1);
    } catch {
      setUploadError("Erro de conexão ao enviar.");
    } finally {
      setUploading(false);
    }
  };

  const publicUrl = value ? getPublicImageUrl(value) || value : "";

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <MediaPicker
            key={refreshKey}
            sizeKey={SIZE_KEY}
            value={value}
            onChange={onChange}
            disabled={disabled || uploading}
          />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleUpload} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
          {value ? (
            <>
              <Button type="button" variant="outline" size="sm" className="min-h-[44px]" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                disabled={disabled}
                onClick={() => onChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
    </div>
  );
}
