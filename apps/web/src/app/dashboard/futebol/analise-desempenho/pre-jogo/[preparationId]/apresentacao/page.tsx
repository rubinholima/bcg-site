"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import {
  PreMatchTacticalBoard,
  type TacticalBoardState,
} from "@/components/dashboard/futebol/analise-desempenho/PreMatchTacticalBoard";
import { api } from "@/lib/api";

export default function PreJogoApresentacaoPage() {
  const preparationId = String(useParams().preparationId ?? "");
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<Record<string, { text?: string }>>({});
  const [board, setBoard] = useState<TacticalBoardState>({ elements: [] });
  const [tab, setTab] = useState(0);
  const tabs = [
    { key: "jogo", label: "Jogo" },
    { key: "adversario", label: "Adversário" },
    { key: "plano_comissao", label: "Plano da comissão" },
    { key: "board", label: "Quadro tático" },
  ];

  useEffect(() => {
    api
      .get<{
        title: string;
        versions: Array<{ sections?: Record<string, { text?: string }>; tacticalBoard?: TacticalBoardState }>;
      }>(`/performance-analysis/pre-match/${preparationId}`)
      .then(({ data }) => {
        setTitle(data.title);
        const v = data.versions[0];
        setSections(v?.sections ?? {});
        setBoard((v?.tacticalBoard as TacticalBoardState) ?? { elements: [] });
      })
      .finally(() => setLoading(false));
  }, [preparationId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const current = tabs[tab];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-foreground">
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Modo apresentação</p>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/pre-jogo/${preparationId}${suffix}`}>
            <X className="h-5 w-5" />
            <span className="sr-only">Sair</span>
          </Link>
        </Button>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-border/30 px-4 py-2">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            className={`min-h-[44px] rounded-md px-3 text-sm ${i === tab ? "bg-violet-500/20 text-violet-100" : "text-muted-foreground"}`}
            onClick={() => setTab(i)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto p-6">
        {current.key === "board" ? (
          <div className="mx-auto max-w-2xl">
            <PreMatchTacticalBoard value={board} onChange={() => {}} readOnly />
          </div>
        ) : (
          <article className="prose prose-invert mx-auto max-w-3xl whitespace-pre-wrap text-base">
            {sections[current.key]?.text?.trim() || "—"}
          </article>
        )}
      </main>
    </div>
  );
}
