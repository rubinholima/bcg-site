"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, CheckSquare, Square } from "lucide-react";

export type GalleryPhotoRow = {
  id: string;
  fullUrl: string;
  caption: string | null;
};

function extFromUrl(url: string): string {
  const m = url.split("?")[0]?.match(/\.(jpe?g|png|webp|gif)(?:$)/i);
  if (!m) return ".jpg";
  const e = m[1].toLowerCase();
  return e === "jpeg" ? ".jpg" : `.${e}`;
}

function safeFilePrefix(slug: string): string {
  const s = slug
    .trim()
    .slice(0, 48)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return s || "fotos";
}

async function downloadOneFile(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }
}

export function GalleryJournalistClient({
  eventSlug,
  photos,
}: {
  eventSlug: string;
  photos: GalleryPhotoRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);

  const prefix = useMemo(() => safeFilePrefix(eventSlug), [eventSlug]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(photos.map((p) => p.id)));
  }, [photos]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const downloadSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    setDownloadNote(null);
    const ordered = photos.filter((p) => selected.has(p.id));
    let openedFallback = 0;
    for (let i = 0; i < ordered.length; i++) {
      const p = ordered[i]!;
      const ext = extFromUrl(p.fullUrl);
      const filename = `${prefix}-${String(i + 1).padStart(3, "0")}-${p.id.slice(-6)}${ext}`;
      const ok = await downloadOneFile(p.fullUrl, filename);
      if (!ok) openedFallback += 1;
      if (i < ordered.length - 1) {
        await new Promise((r) => setTimeout(r, 450));
      }
    }
    setDownloading(false);
    if (openedFallback > 0) {
      setDownloadNote(
        openedFallback === ordered.length
          ? "Alguns arquivos abriram em nova aba (limite do navegador ou origem da imagem). Salve cada um manualmente."
          : `${openedFallback} arquivo(s) abriram em nova aba — salve manualmente se o download direto não funcionar.`,
      );
    }
  }, [photos, selected, prefix]);

  const n = selected.size;

  return (
    <div className="pb-28 md:pb-8">
      <p className="mb-4 text-sm text-zinc-400">
        Selecione as fotos e use <span className="text-zinc-200">Baixar selecionadas</span>. A vitrine do evento fica na
        página pública.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 border-white/20 bg-zinc-900 text-white hover:bg-zinc-800"
          onClick={selectAll}
        >
          <CheckSquare className="mr-2 h-4 w-4" />
          Selecionar todas ({photos.length})
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 text-zinc-400 hover:text-white"
          onClick={clearAll}
          disabled={n === 0}
        >
          <Square className="mr-2 h-4 w-4" />
          Limpar seleção
        </Button>
      </div>

      {downloadNote && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {downloadNote}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
        {photos.map((photo) => {
          const isOn = selected.has(photo.id);
          return (
            <div
              key={photo.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(photo.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(photo.id);
                }
              }}
              className={`relative cursor-pointer overflow-hidden rounded-lg bg-zinc-900 ring-2 transition-shadow ${
                isOn ? "ring-amber-400 shadow-lg shadow-amber-500/10" : "ring-transparent hover:ring-white/20"
              }`}
            >
              <div
                className="absolute left-2 top-2 z-10 flex min-h-11 min-w-11 items-start justify-start"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isOn}
                  onCheckedChange={() => toggle(photo.id)}
                  className="h-5 w-5 border-white/40 bg-black/50 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-500"
                  aria-label={isOn ? "Desmarcar foto" : "Selecionar foto"}
                />
              </div>
              <div className="aspect-square w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.fullUrl}
                  alt={photo.caption ?? ""}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              {photo.caption ? (
                <p className="line-clamp-2 border-t border-white/5 bg-black/40 px-2 py-1 text-[10px] text-zinc-300 sm:text-xs">
                  {photo.caption}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/90 md:static md:z-0 md:border-0 md:bg-transparent md:px-0 md:py-6 md:backdrop-blur-none">
        <div className="container mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            {n === 0 ? "Nenhuma foto selecionada." : <span className="text-white">{n} foto(s) selecionada(s)</span>}
          </p>
          <Button
            type="button"
            className="min-h-12 w-full gap-2 sm:w-auto sm:min-w-[220px]"
            disabled={n === 0 || downloading}
            onClick={() => void downloadSelected()}
          >
            {downloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Baixando…
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Baixar selecionadas{n > 0 ? ` (${n})` : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
