"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicImageUrl } from "@/lib/media-url";

export type MedicalClinicalUploadResult = {
  name: string;
  fileUrl: string;
  fileKey?: string;
};

export function MedicalClinicalFileUpload({
  playerId,
  defaultLabel,
  disabled,
  onUploaded,
  onError,
}: {
  playerId: string;
  defaultLabel?: string;
  disabled?: boolean;
  onUploaded: (file: MedicalClinicalUploadResult) => void;
  onError?: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!playerId) {
      onError?.("Selecione o atleta antes de enviar.");
      return;
    }
    if (!file) {
      onError?.("Selecione um arquivo (PDF ou imagem).");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("playerId", playerId);
      formData.append("name", label.trim() || file.name);
      const { data } = await api.postForm<MedicalClinicalUploadResult>(
        "/medical-encounters/clinical-upload",
        formData,
      );
      onUploaded(data);
      setFile(null);
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      onError?.("Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <Input
        placeholder="Nome / descrição do documento"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        disabled={disabled || uploading}
      />
      <Input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        className="text-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 sm:col-span-2"
        disabled={disabled || uploading}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full sm:w-auto sm:col-span-2"
        disabled={disabled || uploading || !file}
        onClick={() => void upload()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Enviar arquivo
      </Button>
    </div>
  );
}

export function MedicalClinicalFileLink({
  label,
  fileUrl,
}: {
  label: string;
  fileUrl: string;
}) {
  return (
    <a
      href={getPublicImageUrl(fileUrl)}
      target="_blank"
      rel="noreferrer"
      className="text-primary hover:underline"
    >
      {label}
    </a>
  );
}
