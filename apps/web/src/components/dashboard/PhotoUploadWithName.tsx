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
  /** Quando true: não faz upload imediato; chama onFileSelect para o pai enviar ao salvar */
  deferredUpload?: boolean;
  /** Chamado quando usuário escolhe arquivo (só em deferredUpload). Pai envia no save. */
  onFileSelect?: (file: File | null) => void;
  /** Arquivo pendente (pai controla em modo deferred) */
  pendingFile?: File | null;
  /** Nome obrigatório para habilitar upload — se vazio, botão desabilitado */
  requireNameToUpload?: string;
  /** Nome da foto preenchido automaticamente (ex: nome do atleta). Obrigatório mas não precisa escrever. */
  displayNameAuto?: string;
  /** Ocultar preview quadrado (ex: quando header já mostra avatar) */
  hidePreview?: boolean;
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
  deferredUpload = false,
  onFileSelect,
  pendingFile,
  requireNameToUpload,
  displayNameAuto,
  hidePreview = false,
}: PhotoUploadWithNameProps) {
  const [photoDisplayName, setPhotoDisplayName] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (deferredUpload && onFileSelect) {
      if (!file) {
        onFileSelect(null);
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
      onFileSelect(file);
      return;
    }
    handleUploadPhoto(e);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Arquivo muito grande. Máximo 10 MB.");
      e.target.value = "";
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setUploadError("Formato inválido. Use PNG, JPG, WebP ou SVG.");
      e.target.value = "";
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", sizeKey);
      const displayName = displayNameAuto?.trim() || photoDisplayName?.trim();
      if (displayName) {
        formData.append("displayName", displayName);
      }
      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
      const data = (await res.json()) as { url?: string; key?: string; message?: string; error?: string };
      if (!res.ok) {
        const errMsg = data?.message ?? data?.error ?? "Erro ao enviar. Tente novamente.";
        setUploadError(typeof errMsg === "string" ? errMsg : "Erro ao enviar.");
        e.target.value = "";
        return;
      }
      if (data?.url) {
        onChange(data.url);
        onPhotoKeyChange?.(data.key ?? photoKey);
        setUploadSuccess(true);
        setPhotoRefreshKey((k) => k + 1);
      }
    } catch {
      setUploadError("Erro de conexão. Verifique se a API está rodando.");
    } finally {
      e.target.value = "";
    }
  };

  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const canUpload = !requireNameToUpload || requireNameToUpload.trim().length > 0;
  const effectivePreview = pendingFile && pendingPreviewUrl ? pendingPreviewUrl : value;

  const folderLabel = SIZE_KEY_TO_LABEL[sizeKey] ?? sizeKey;

  return (
    <div className="space-y-2">
      {uploadError && (
        <div className="rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {photoDisplayName?.trim()
            ? `Foto "${photoDisplayName.trim()}" enviada com sucesso para pasta ${folderLabel}!`
            : "Foto enviada com sucesso!"}
        </div>
      )}
      <div className={hidePreview ? "flex gap-4" : "flex gap-4"}>
        {!hidePreview && (
        <div className="h-24 w-24 rounded overflow-hidden bg-muted shrink-0">
          {effectivePreview ? (
            <img
              src={effectivePreview.startsWith("blob:") ? effectivePreview : getPublicImageUrl(effectivePreview)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-10 w-10" />
            </div>
          )}
        </div>
        )}
        <div className="flex-1 space-y-2 min-w-0">
          <MediaPicker
            sizeKey={sizeKey}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            refreshTrigger={photoRefreshKey}
            hideEmptyFolderHint
          />
          {!displayNameAuto && (
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
          )}
          {displayNameAuto && (
          <p className="text-xs text-muted-foreground">Nome da foto: {displayNameAuto.trim() || "—"} (automático)</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
              disabled={disabled || !canUpload}
            >
              Enviar nova foto
            </Button>
            {!canUpload && requireNameToUpload !== undefined && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Preencha o nome completo para selecionar foto.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP ou SVG — até 10 MB. Recomendado: 800×600 px.
            </p>
          </div>
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
