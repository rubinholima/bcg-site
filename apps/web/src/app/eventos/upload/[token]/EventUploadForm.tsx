"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle } from "lucide-react";

export function EventUploadForm({ token, eventName }: { token: string; eventName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione uma foto.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption.trim()) formData.append("caption", caption.trim());
      const res = await fetch(`/api/public/events/upload/${encodeURIComponent(token)}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string })?.message ?? "Erro ao enviar");
      }
      setSuccess(true);
      setFile(null);
      setCaption("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Foto enviada com sucesso! Você pode enviar mais.
        </div>
      )}
      <div>
        <Label htmlFor="file">Foto</Label>
        <Input
          id="file"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 text-foreground"
        />
      </div>
      <div>
        <Label htmlFor="caption">Legenda (opcional)</Label>
        <Input
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Ex: Gol do time A aos 23'"
          className="mt-1 text-foreground"
        />
      </div>
      <Button type="submit" disabled={uploading || !file} className="gap-2">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Enviar foto
          </>
        )}
      </Button>
    </form>
  );
}
