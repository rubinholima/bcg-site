"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

const RH_DOC_SIZE_KEY = "rh_documentos" as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp,.pdf,.png,.jpg,.jpeg,.webp";

interface RhInlineDocumentPickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Picker inline: dropdown da mídia + envio direto aqui (sem ir para outra tela). */
export function RhInlineDocumentPicker({
  label,
  value,
  onChange,
  placeholder = "Escolher documento…",
  disabled = false,
}: RhInlineDocumentPickerProps) {
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
      formData.append("sizeKey", RH_DOC_SIZE_KEY);
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

  return (
    <div className="grid min-w-0 gap-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <MediaPicker
            sizeKey={RH_DOC_SIZE_KEY}
            allowAllFolders
            uploadFolderHint={RH_DOC_SIZE_KEY}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 sm:mt-0 h-10"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Upload className="mr-1.5 h-4 w-4" />
              Enviar arquivo
            </>
          )}
        </Button>
      </div>
      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
    </div>
  );
}

interface RhDateDocumentRowProps {
  dateLabel: string;
  dateId: string;
  dateValue: string;
  onDateChange: (value: string) => void;
  fileLabel: string;
  fileValue: string;
  onFileChange: (url: string) => void;
}

/** Data e anexo na mesma linha (lado a lado). */
export function RhDateDocumentRow({
  dateLabel,
  dateId,
  dateValue,
  onDateChange,
  fileLabel,
  fileValue,
  onFileChange,
}: RhDateDocumentRowProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-start">
      <div className="grid min-w-0 shrink-0 gap-2 sm:w-[min(100%,220px)]">
        <Label htmlFor={dateId}>{dateLabel}</Label>
        <Input
          id={dateId}
          type="date"
          className="text-foreground [&::-webkit-datetime-edit]:text-foreground h-10"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <RhInlineDocumentPicker label={fileLabel} value={fileValue} onChange={onFileChange} />
      </div>
    </div>
  );
}
