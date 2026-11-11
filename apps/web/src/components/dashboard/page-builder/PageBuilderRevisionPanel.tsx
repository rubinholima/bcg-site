"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/authFetch";

type RevisionRow = { id: string; createdAt: string; createdBy: string | null; label: string | null };

export function PageBuilderRevisionPanel({
  pageId,
  onRestored,
}: {
  pageId: string;
  onRestored: () => void;
}) {
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/pages/${encodeURIComponent(pageId)}/revisions`, { credentials: "include" });
      if (!res.ok) throw new Error("Não foi possível carregar revisões.");
      setRows((await res.json()) as RevisionRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (revisionId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/pages/${encodeURIComponent(pageId)}/revisions/${encodeURIComponent(revisionId)}/restore`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) throw new Error("Falha ao restaurar revisão.");
      onRestored();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Histórico de revisões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-border/60 px-2 py-1.5">
              <span>
                {new Date(r.createdAt).toLocaleString("pt-BR")}
                {r.label ? ` · ${r.label}` : ""}
              </span>
              <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => restore(r.id)}>
                Restaurar
              </Button>
            </li>
          ))}
          {!rows.length && !loading ? <li className="text-muted-foreground">Nenhuma revisão publicada ainda.</li> : null}
        </ul>
      </CardContent>
    </Card>
  );
}
