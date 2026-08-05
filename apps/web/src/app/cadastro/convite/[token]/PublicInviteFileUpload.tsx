"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getApiBaseUrl } from "@/lib/apiProxy";
import { getPublicImageUrl } from "@/lib/media-url";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const DOC_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif";
const PHOTO_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.png,.jpg,.jpeg,.webp,.heic,.heif";

interface PublicInviteFileUploadProps {
  token: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  documentType: string;
  documentName: string;
  mode?: "document" | "photo";
  className?: string;
}

export function PublicInviteFileUpload({
  token,
  label,
  value,
  onChange,
  documentType,
  documentName,
  mode = "document",
  className,
}: PublicInviteFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const accept = mode === "photo" ? PHOTO_ACCEPT : DOC_ACCEPT;
  const previewUrl = value.trim() ? getPublicImageUrl(value) : "";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Arquivo muito grande. Máximo 25 MB.");
      return;
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
    if (mode === "photo" && !isImage) {
      setUploadError("Use uma foto (PNG, JPG, WebP ou HEIC).");
      return;
    }
    if (mode === "document" && !isPdf && !isImage) {
      setUploadError("Use PDF ou foto (PNG, JPG, WebP, HEIC).");
      return;
    }

    setUploading(true);
    try {
      const base = getApiBaseUrl().replace(/\/$/, "");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", documentName);
      fd.append("documentType", documentType);
      const res = await fetch(
        `${base}/public/registration-invite/${encodeURIComponent(token)}/documents`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Erro ao enviar arquivo");
      }
      const doc = (await res.json()) as { fileUrl?: string };
      if (!doc.fileUrl) throw new Error("Resposta inválida do servidor");
      onChange(doc.fileUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label className="text-sm">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFile}
      />
      {value.trim() ? (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-3">
          <div className="flex items-start gap-3">
            {mode === "photo" && previewUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                <Image
                  src={previewUrl}
                  alt="Foto enviada"
                  fill
                  className="object-cover object-[center_20%]"
                  unoptimized
                />
              </div>
            ) : (
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-300">Arquivo enviado</p>
              <p className="mt-0.5 text-xs text-zinc-400 break-all">{documentName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trocar arquivo"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10 text-red-400 hover:text-red-300"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              <X className="mr-1.5 h-4 w-4" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-start sm:w-auto"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4 shrink-0" />
          )}
          {mode === "photo" ? "Tirar foto ou escolher da galeria" : "Enviar PDF ou foto"}
        </Button>
      )}
      <p className="text-xs text-zinc-500">
        {mode === "photo"
          ? "No iPhone: toque para abrir a câmera ou a galeria."
          : "No iPhone: você pode fotografar o documento ou enviar um PDF."}
      </p>
      {uploadError ? <p className="text-xs text-red-400">{uploadError}</p> : null}
    </div>
  );
}
