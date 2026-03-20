"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle, X, ImagePlus, AlertCircle } from "lucide-react";

const MAX_MB = 15;
const MAX_BYTES = MAX_MB * 1024 * 1024;

type QueueItem = {
  file: File;
  id: string;
  previewUrl: string;
};

type SendResult = { id: string; name: string; ok: boolean; error?: string };

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function EventUploadForm({ token, eventName }: { token: string; eventName: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [captionAll, setCaptionAll] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastBatchResults, setLastBatchResults] = useState<SendResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const revokePreviews = useCallback((items: QueueItem[]) => {
    items.forEach((q) => URL.revokeObjectURL(q.previewUrl));
  }, []);

  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => {
    return () => revokePreviews(queueRef.current);
  }, [revokePreviews]);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) {
        setError("Nenhuma imagem válida (use JPG, PNG ou WebP).");
        return;
      }
      const tooBig = arr.filter((f) => f.size > MAX_BYTES);
      if (tooBig.length > 0) {
        setError(`${tooBig.length} arquivo(s) acima de ${MAX_MB} MB foram ignorados.`);
      } else {
        setError(null);
      }
      const ok = arr.filter((f) => f.size <= MAX_BYTES);
      setQueue((prev) => {
        const next = [
          ...prev,
          ...ok.map((file) => ({
            file,
            id: makeId(),
            previewUrl: URL.createObjectURL(file),
          })),
        ];
        return next;
      });
      setLastBatchResults(null);
    },
    [],
  );

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const clearQueue = () => {
    revokePreviews(queue);
    setQueue([]);
    setLastBatchResults(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) addFiles(files);
    e.target.value = "";
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const runUpload = async () => {
    if (queue.length === 0) {
      setError("Selecione pelo menos uma foto.");
      return;
    }
    setError(null);
    setUploading(true);
    setLastBatchResults(null);
    const items = [...queue];
    const total = items.length;
    setProgress({ done: 0, total });
    const results: SendResult[] = [];
    const cap = captionAll.trim();

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const { file, id: queueId } = item;
        const formData = new FormData();
        formData.append("file", file);
        if (cap) formData.append("caption", cap);
        try {
          const res = await fetch(`/api/public/events/upload/${encodeURIComponent(token)}`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = (data as { message?: string })?.message ?? `Erro HTTP ${res.status}`;
            results.push({ id: queueId, name: file.name, ok: false, error: msg });
          } else {
            results.push({ id: queueId, name: file.name, ok: true });
          }
        } catch {
          results.push({ id: queueId, name: file.name, ok: false, error: "Falha de rede" });
        }
        setProgress({ done: i + 1, total });
      }

      setLastBatchResults(results);
      const allOk = results.every((r) => r.ok);
      const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      const failed = results.filter((r) => !r.ok);
      if (allOk) {
        revokePreviews(queue);
        setQueue([]);
        if (inputRef.current) inputRef.current.value = "";
      } else if (okIds.size > 0) {
        setQueue((prev) => {
          const removed = prev.filter((q) => okIds.has(q.id));
          const next = prev.filter((q) => !okIds.has(q.id));
          revokePreviews(removed);
          return next;
        });
      }
    } finally {
      setUploading(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  const failCount = lastBatchResults?.filter((r) => !r.ok).length ?? 0;
  const okCount = lastBatchResults?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {lastBatchResults && lastBatchResults.length > 0 && (
        <div
          className={`rounded-md border p-3 text-sm ${
            failCount === 0
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-100"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {failCount === 0
              ? `${okCount} foto(s) enviada(s) com sucesso.`
              : `${okCount} ok, ${failCount} com erro — corrija ou reenvie as que falharam.`}
          </div>
          {failCount > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs opacity-90">
              {lastBatchResults
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.id}>
                    {r.name}: {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-white/20 bg-zinc-900/80 px-4 py-10 text-center transition-colors hover:border-amber-400/50 hover:bg-zinc-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          multiple
          className="sr-only"
          aria-label="Selecionar fotos"
          onChange={handleFileInput}
        />
        <ImagePlus className="mx-auto h-12 w-12 text-amber-400/90" aria-hidden />
        <p className="mt-3 text-base font-medium text-white">
          Toque para escolher várias fotos
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          No celular: abre a galeria — marque várias de uma vez. No computador: arraste pastas ou clique aqui.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          JPG, PNG ou WebP · até {MAX_MB} MB por arquivo · {eventName}
        </p>
      </div>

      {queue.length > 0 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-white">
              Na fila: <span className="text-amber-400">{queue.length}</span> foto(s)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 border-white/20"
                disabled={uploading}
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Adicionar mais
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 text-zinc-400"
                disabled={uploading}
                onClick={(e) => {
                  e.stopPropagation();
                  clearQueue();
                }}
              >
                Limpar tudo
              </Button>
            </div>
          </div>
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
            {queue.map((q) => (
              <div key={q.id} className="group relative aspect-square overflow-hidden rounded-md bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(q.id);
                  }}
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white opacity-90 hover:bg-destructive md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Remover da fila"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="caption-all" className="text-zinc-300">
          Legenda para todas (opcional)
        </Label>
        <Input
          id="caption-all"
          value={captionAll}
          onChange={(e) => setCaptionAll(e.target.value)}
          placeholder="Ex.: Boston City Cup 2026 — semifinal"
          className="min-h-11 text-foreground"
          disabled={uploading}
        />
        <p className="text-xs text-zinc-500">
          A mesma legenda será aplicada a cada arquivo deste envio (agilidade em lote).
        </p>
      </div>

      <Button
        type="button"
        disabled={uploading || queue.length === 0}
        className="min-h-12 w-full gap-2 text-base sm:w-auto sm:min-w-[200px]"
        onClick={() => void runUpload()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Enviando {progress.done}/{progress.total}…
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            Enviar {queue.length > 0 ? `${queue.length} foto(s)` : "fotos"}
          </>
        )}
      </Button>
    </div>
  );
}
