"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { extractFinanceError } from "./finance-api-helpers";

export type FinanceUploadedFile = {
  fileKey: string;
  fileName: string;
  mimeType?: string;
};

export function FinancePrivateFileUpload({
  tenantId,
  disabled,
  buttonLabel = "Enviar arquivo",
  onUploaded,
  onError,
}: {
  tenantId: string;
  disabled?: boolean;
  buttonLabel?: string;
  onUploaded: (file: FinanceUploadedFile) => void;
  onError?: (message: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(file: File | null) {
    if (!file || !tenantId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tenantId", tenantId);
      const { data } = await api.postForm<FinanceUploadedFile>("/financeiro/arquivos/privado", fd);
      onUploaded(data);
      if (ref.current) ref.current.value = "";
    } catch (e) {
      onError?.(extractFinanceError(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        className="max-w-full text-sm text-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
        disabled={disabled || uploading}
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />
      {uploading ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando…
        </span>
      ) : (
        <Button type="button" size="sm" variant="outline" className="gap-1" disabled={disabled} onClick={() => ref.current?.click()}>
          <Upload className="h-3 w-3" />
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
