"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";

const SIZE_KEY = "logistica_comprovantes" as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp,.pdf,.png,.jpg,.jpeg,.webp";

interface Props {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function LogisticaComprovantePicker({ value, onChange, disabled }: Props) {
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
      setUploadError("Arquivo muito grande. Máximo 10 MB.");
      return;
    }

    const allowed =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!allowed) {
      setUploadError("Use PDF ou imagem (PNG, JPG, WebP).");
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
    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
      <Label className="text-xs">Comprovante</Label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <MediaPicker
            sizeKey={SIZE_KEY}
            allowAllFolders
            uploadFolderHint={SIZE_KEY}
            value={value}
            onChange={onChange}
            placeholder="Escolher comprovante…"
            refreshTrigger={refreshKey}
            hideEmptyFolderHint
            className="min-w-0"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleUpload}
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
          {publicUrl ? (
            <>
              <Button type="button" variant="outline" size="sm" className="min-h-[44px]" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Abrir
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
                disabled={disabled}
                onClick={() => onChange("")}
                aria-label="Remover comprovante"
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
