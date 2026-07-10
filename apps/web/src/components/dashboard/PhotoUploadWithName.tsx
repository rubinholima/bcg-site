"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getDashboardMediaThumbSrc, urlToMediaKey } from "@/lib/media-url";
import { api } from "@/lib/api";
import type { MediaPlaceholderSizeKey } from "@/lib/media-placeholders";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

function validateImageFile(file: File): string | null {
  if (file.size > 10 * 1024 * 1024) return "Arquivo muito grande. Máximo 10 MB.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif") {
    return "Foto HEIC do iPhone não é suportada aqui. Envie JPG ou PNG, ou ajuste a câmera para «Mais compatível».";
  }
  const allowedExt = ["png", "jpg", "jpeg", "webp", "svg"];
  if ((!file.type || file.type === "application/octet-stream") && allowedExt.includes(ext)) return null;
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return null;
  return "Formato inválido. Use PNG, JPG, WebP ou SVG.";
}

/** Pastas por departamento: medico, psicologia, comissao, jogadores, etc. */
const SIZE_KEY_TO_LABEL: Record<string, string> = {
  medico: "Depto Médico",
  psicologia: "Psicologia",
  comissao: "Comissão técnica",
  jogadores: "Jogadores",
  patrimonio: "Patrimônio",
  rh: "RH",
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
  /** Mostrar linha “Nome da foto: … (automático)” quando displayNameAuto está definido */
  showAutomaticPhotoNameNote?: boolean;
  /** Texto “PNG, JPG…” abaixo do botão de envio */
  showFileFormatHint?: boolean;
  /** Listar todas as pastas no seletor de mídia */
  allowAllFolders?: boolean;
  uploadFolderHint?: MediaPlaceholderSizeKey;
  /** Ocultar preview quadrado (ex: quando header já mostra avatar) */
  hidePreview?: boolean;
  /** Campo manual de URL da imagem */
  showUrlInput?: boolean;
  /** Pai está gravando a URL no registro (ex.: PATCH do bem patrimonial). */
  recordLinking?: boolean;
  recordLinkingLabel?: string;
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
  showAutomaticPhotoNameNote = true,
  showFileFormatHint = true,
  allowAllFolders = false,
  uploadFolderHint,
  hidePreview = false,
  showUrlInput = true,
  recordLinking = false,
  recordLinkingLabel = "Salvando foto no registro…",
}: PhotoUploadWithNameProps) {
  const [photoDisplayName, setPhotoDisplayName] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localUploadPreview, setLocalUploadPreview] = useState<string | null>(null);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const photoKey = value ? urlToMediaKey(value) : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadSuccess) return;
    const t = setTimeout(() => setUploadSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [uploadSuccess]);

  useEffect(() => {
    return () => {
      if (localUploadPreview) URL.revokeObjectURL(localUploadPreview);
    };
  }, [localUploadPreview]);

  useEffect(() => {
    if (!value?.trim()) return;
    const key = urlToMediaKey(value);
    if (!key?.trim()) return;
    fetch(`/api/media?sizeKey=${encodeURIComponent(sizeKey)}`, {
      credentials: "include",
      cache: "no-store",
    })
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (deferredUpload && onFileSelect) {
      if (!file) {
        onFileSelect(null);
        return;
      }
      const err = validateImageFile(file);
      if (err) {
        setUploadError(err);
        return;
      }
      onFileSelect(file);
      return;
    }
    void handleUploadPhoto(e);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      e.target.value = "";
      return;
    }
    setUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setLocalUploadPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sizeKey", sizeKey);
      const displayName = displayNameAuto?.trim() || photoDisplayName?.trim();
      if (displayName) {
        formData.append("displayName", displayName);
      }
      const { data } = await api.postForm<{ url?: string; key?: string }>("/media", formData);
      if (data?.url) {
        onChange(data.url);
        onPhotoKeyChange?.(data.key ?? photoKey);
        setUploadSuccess(true);
        setPhotoRefreshKey((k) => k + 1);
      } else {
        setUploadError("Upload concluído sem URL. Tente novamente.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro de conexão. Verifique se a API está rodando.");
    } finally {
      setUploading(false);
      setLocalUploadPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
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
  const busy = uploading || recordLinking || disabled;
  const effectivePreview =
    localUploadPreview || (pendingFile && pendingPreviewUrl ? pendingPreviewUrl : value);

  const resolvedPreviewUrl =
    effectivePreview && !effectivePreview.startsWith("blob:")
      ? getDashboardMediaThumbSrc(effectivePreview)
      : effectivePreview;

  const folderLabel = SIZE_KEY_TO_LABEL[sizeKey] ?? sizeKey;

  const statusMessage = uploading
    ? `Enviando foto para pasta ${folderLabel}… aguarde (otimização e upload no servidor).`
    : recordLinking
      ? recordLinkingLabel
      : null;

  return (
    <div className="space-y-2">
      {statusMessage ? (
        <div
          className="rounded-md bg-sky-500/15 border border-sky-500/35 px-3 py-2.5 text-sm text-foreground flex items-start gap-2.5"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 mt-0.5 animate-spin shrink-0 text-sky-500" />
          <span>{statusMessage}</span>
        </div>
      ) : null}
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
        <div className="relative h-24 w-24 rounded overflow-hidden bg-muted shrink-0">
          {effectivePreview ? (
            <img
              src={resolvedPreviewUrl ?? ""}
              alt=""
              className={`h-full w-full object-cover ${busy ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-10 w-10" />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : null}
        </div>
        )}
        <div className="flex-1 space-y-2 min-w-0">
          <MediaPicker
            sizeKey={sizeKey}
            allowAllFolders={allowAllFolders}
            uploadFolderHint={uploadFolderHint}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            refreshTrigger={photoRefreshKey}
            hideEmptyFolderHint
            allowUpload={false}
            showUploadHint={false}
            disabled={busy}
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
          {displayNameAuto && showAutomaticPhotoNameNote && (
          <p className="text-xs text-muted-foreground">Nome da foto: {displayNameAuto.trim() || "—"} (automático)</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            form=""
            onChange={handleFileChange}
          />
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
              disabled={busy || !canUpload}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando foto…
                </>
              ) : (
                "Enviar foto"
              )}
            </Button>
            {!canUpload && requireNameToUpload !== undefined && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Preencha o nome completo para selecionar foto.
              </p>
            )}
            {showFileFormatHint && (
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP ou SVG — até 10 MB. Recomendado: 800×600 px.
            </p>
            )}
          </div>
          {showUrlInput ? (
            <Input
              placeholder={urlPlaceholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={busy}
              className="text-foreground"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
