"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle, X, ImagePlus, AlertCircle } from "lucide-react";

const MAX_MB = 15;
const MAX_BYTES = MAX_MB * 1024 * 1024;

type QueueItem = { file: File; id: string; previewUrl: string };
type SendResult = { id: string; name: string; ok: boolean; error?: string };

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ClubPressUploadForm({ token, clubName }: { token: string; clubName: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [captionAll, setCaptionAll] = useState("");
  const [matchLabel, setMatchLabel] = useState("");
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
  useEffect(() => () => revokePreviews(queueRef.current), [revokePreviews]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) {
      setError("Nenhuma imagem válida (use JPG, PNG ou WebP).");
      return;
    }
    const tooBig = arr.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length > 0) setError(`${tooBig.length} arquivo(s) acima de ${MAX_MB} MB foram ignorados.`);
    else setError(null);
    const ok = arr.filter((f) => f.size <= MAX_BYTES);
    setQueue((prev) => [
      ...prev,
      ...ok.map((file) => ({ file, id: makeId(), previewUrl: URL.createObjectURL(file) })),
    ]);
    setLastBatchResults(null);
  }, []);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleSend = async () => {
    if (queue.length === 0) return;
    setUploading(true);
    setError(null);
    const items = [...queue];
    const total = items.length;
    setProgress({ done: 0, total });
    const results: SendResult[] = [];
    const cap = captionAll.trim();
    const match = matchLabel.trim();
    try {
      for (let i = 0; i < items.length; i++) {
        const { file, id: queueId } = items[i]!;
        const formData = new FormData();
        formData.append("file", file);
        if (cap) formData.append("caption", cap);
        if (match) formData.append("matchLabel", match);
        try {
          const res = await fetch(`/api/public/press/upload/${encodeURIComponent(token)}`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            results.push({ id: queueId, name: file.name, ok: false, error: (data as { message?: string })?.message ?? `Erro ${res.status}` });
          } else {
            results.push({ id: queueId, name: file.name, ok: true });
          }
        } catch {
          results.push({ id: queueId, name: file.name, ok: false, error: "Falha de rede" });
        }
        setProgress({ done: i + 1, total });
      }
      setLastBatchResults(results);
      const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      setQueue((prev) => {
        const kept = prev.filter((q) => !okIds.has(q.id));
        prev.filter((q) => okIds.has(q.id)).forEach((q) => URL.revokeObjectURL(q.previewUrl));
        return kept;
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Envio oficial para <strong className="text-zinc-200">{clubName}</strong>. Selecione várias fotos de uma vez (celular ou computador).
      </p>
      <div className="space-y-2">
        <Label className="text-zinc-200">Partida / jogo (opcional)</Label>
        <Input
          placeholder="Ex.: Villa Nova x América — 15/03/2025"
          value={matchLabel}
          onChange={(e) => setMatchLabel(e.target.value)}
          className="text-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-200">Legenda para todas (opcional)</Label>
        <Input placeholder="Crédito ou descrição" value={captionAll} onChange={(e) => setCaptionAll(e.target.value)} className="text-foreground" />
      </div>
      <div
        className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-zinc-900/50 p-6 transition hover:border-amber-500/40"
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; }}
        onDragLeave={(e) => { e.preventDefault(); dragDepth.current--; }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <ImagePlus className="mb-2 h-8 w-8 text-amber-400/80" />
        <p className="text-sm text-zinc-300">Arraste fotos ou toque para escolher</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>
      {error ? <p className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="h-4 w-4" />{error}</p> : null}
      {queue.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {queue.map((q) => (
            <div key={q.id} className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.previewUrl} alt="" className="h-full w-full object-cover" />
              <button type="button" className="absolute right-1 top-1 rounded bg-black/70 p-1" onClick={() => removeFromQueue(q.id)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <Button type="button" className="min-h-11 w-full gap-2" disabled={uploading || queue.length === 0} onClick={() => void handleSend()}>
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        {uploading ? `Enviando ${progress.done}/${progress.total}…` : `Enviar ${queue.length} foto(s)`}
      </Button>
      {lastBatchResults ? (
        <ul className="space-y-1 text-sm">
          {lastBatchResults.map((r) => (
            <li key={r.id} className={r.ok ? "text-emerald-400" : "text-red-400"}>
              {r.ok ? <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> : null}
              {r.name} {r.ok ? "— enviada" : `— ${r.error}`}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
