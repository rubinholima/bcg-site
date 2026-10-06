"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreMatchTacticalBoard, type TacticalBoardState } from "./PreMatchTacticalBoard";
import { AnalysisPrivateClipPlayer } from "./AnalysisPrivateClipPlayer";
import { ANALISE_DESEMPENHO_BASE } from "./AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

type Props = {
  versionId: string;
  preparationId: string;
  querySuffix: string;
  titleFallback?: string;
};

type Slide =
  | { kind: "text"; key: string; label: string; text: string }
  | { kind: "board"; key: "board"; label: string; board: TacticalBoardState }
  | { kind: "clips"; key: "clips"; label: string; clipIds: string[] };

export function PreMatchPresentationView({
  versionId,
  preparationId,
  querySuffix,
  titleFallback,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(titleFallback ?? "");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        preparation: { title: string };
        version: { sections?: Record<string, { text?: string }>; tacticalBoard?: TacticalBoardState };
        sectionKeys: string[];
        sectionLabels: Record<string, string>;
        clips: Array<{ clip: { id: string } }>;
      }>(`/performance-analysis/pre-match/versions/${versionId}/presentation`);
      setTitle(data.preparation.title);
      const built: Slide[] = [];
      for (const key of data.sectionKeys) {
        if (key === "clips_selecionados") {
          built.push({
            kind: "clips",
            key: "clips",
            label: data.sectionLabels[key] ?? key,
            clipIds: data.clips.map((c) => c.clip.id),
          });
          continue;
        }
        built.push({
          kind: "text",
          key,
          label: data.sectionLabels[key] ?? key,
          text: data.version.sections?.[key]?.text?.trim() ?? "—",
        });
      }
      built.push({
        kind: "board",
        key: "board",
        label: "Quadro tático",
        board: (data.version.tacticalBoard as TacticalBoardState) ?? { elements: [] },
      });
      setSlides(built);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const slide = slides[index];
  if (!slide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-muted-foreground">
        Nenhuma seção habilitada para apresentação.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-foreground">
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Modo apresentação</p>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/pre-jogo/${preparationId}${querySuffix}`}>
            <X className="h-5 w-5" />
            <span className="sr-only">Sair</span>
          </Link>
        </Button>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-border/30 px-4 py-2">
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={`min-h-[44px] rounded-md px-3 text-sm ${i === index ? "bg-violet-500/20 text-violet-100" : "text-muted-foreground"}`}
            onClick={() => setIndex(i)}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto p-6">
        {slide.kind === "board" ? (
          <div className="mx-auto max-w-2xl">
            <PreMatchTacticalBoard value={slide.board} onChange={() => {}} readOnly />
          </div>
        ) : slide.kind === "clips" ? (
          <div className="mx-auto max-w-3xl space-y-6">
            {slide.clipIds.length === 0 ? (
              <p className="text-muted-foreground">Nenhum clip selecionado.</p>
            ) : (
              slide.clipIds.map((id) => <AnalysisPrivateClipPlayer key={id} clipId={id} />)
            )}
          </div>
        ) : (
          <article className="mx-auto max-w-3xl whitespace-pre-wrap text-base leading-relaxed">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{slide.label}</h2>
            {slide.text}
          </article>
        )}
      </main>
      <footer className="flex justify-between border-t border-border/30 px-4 py-2 text-sm text-muted-foreground">
        <span>
          {index + 1} / {slides.length}
        </span>
        <span>Setas ← → para navegar</span>
      </footer>
    </div>
  );
}
