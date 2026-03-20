"use client";

import { useState, useEffect, useRef } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicImageUrl } from "@/lib/media-url";

/**
 * Padrão universal de upload de logo/imagem: preview, Escolher imagem,
 * nome automático, Enviar nova logo, requisitos técnicos, URL manual.
 * Usar em eventos, empresas, grupo, etc.
 */
export interface LogoUploadWithNameProps {
  /** URL atual do logo */
  value: string;
  onChange: (url: string) => void;
  /** scope para /api/upload/logo: "group", tenantId ou "event:{eventId}". Opcional em deferredUpload. */
  scope?: string;
  /** Nome usado como displayName no S3 — sempre automático */
  displayNameAuto: string;
  disabled?: boolean;
  /** Título da seção (ex: "Logo", "Foto") */
  sectionLabel?: string;
  /** Placeholder do botão de escolher */
  choosePlaceholder?: string;
  /** Placeholder do campo URL */
  urlPlaceholder?: string;
  /** Quando true: não faz upload; chama onFileSelect para o pai enviar ao salvar */
  deferredUpload?: boolean;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function LogoUploadWithName({
  value,
  onChange,
  scope,
  displayNameAuto,
  disabled = false,
  sectionLabel = "Logo",
  choosePlaceholder = "Escolher imagem",
  urlPlaceholder = "Ou colar URL da foto",
  deferredUpload = false,
  onFileSelect,
  pendingFile,
}: LogoUploadWithNameProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadSuccess) return;
    const t = setTimeout(() => setUploadSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [uploadSuccess]);

  const effectiveFile = pendingFile ?? selectedFile;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!effectiveFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(effectiveFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [effectiveFile]);

  const effectivePreview = previewUrl ?? value;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    e.target.value = "";

    if (!file) {
      if (deferredUpload && onFileSelect) onFileSelect(null);
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Arquivo muito grande. Máximo 10 MB.");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setUploadError("Formato inválido. Use PNG, JPG, WebP ou SVG.");
      return;
    }

    if (deferredUpload && onFileSelect) {
      onFileSelect(file);
      return;
    }
    setSelectedFile(file);
    doUpload(file);
  };

  const doUpload = async (file: File) => {
    if (!scope?.trim()) {
      setUploadError("Scope não definido. Salve o cadastro antes de enviar.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("scope", scope.trim());
      const dn = displayNameAuto?.trim();
      if (dn) form.append("displayName", dn);

      const res = await fetch("/api/upload/logo", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (!res.ok) {
        const errMsg = data?.message ?? data?.error ?? "Erro no upload";
        setUploadError(typeof errMsg === "string" ? errMsg : "Erro ao enviar.");
        return;
      }
      if (data?.url) {
        onChange(data.url);
        setUploadSuccess(true);
        setSelectedFile(null);
      }
    } catch {
      setUploadError("Erro de conexão. Verifique se a API está rodando.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendClick = () => {
    if (effectiveFile && !deferredUpload && scope?.trim()) {
      doUpload(effectiveFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      {uploadError && (
        <div className="rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {sectionLabel} enviado com sucesso!
        </div>
      )}
      <div className="flex gap-4">
        <div className="h-24 w-24 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {effectivePreview ? (
            <img
              src={
                effectivePreview.startsWith("blob:")
                  ? effectivePreview
                  : getPublicImageUrl(effectivePreview)
              }
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setUploadError(null);
              fileInputRef.current?.click();
            }}
            disabled={disabled}
          >
            {choosePlaceholder}
          </Button>
          <p className="text-xs text-muted-foreground">
            Nome da {sectionLabel.toLowerCase()}: {displayNameAuto?.trim() || "—"} (automático)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          {!deferredUpload && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendClick}
              disabled={disabled || uploading || !effectiveFile}
            >
              {uploading ? "Enviando…" : `Enviar nova ${sectionLabel.toLowerCase()}`}
            </Button>
          )}
          {deferredUpload && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              {effectiveFile ? "Trocar imagem" : `Enviar nova ${sectionLabel.toLowerCase()}`}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP ou SVG — até 10 MB. Recomendado: 800×600 px.
          </p>
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
