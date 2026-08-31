"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { invalidateFixtureCategoriesCache } from "@/hooks/useFixtureCategories";
import { CADASTRO_LIST_HREFS } from "@/lib/cadastros-navigation";

export default function DeleteCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    api
      .get<{ labelPT: string; value: string }>(`/fixture-categories/${id}`)
      .then(({ data }) => setLabel(data ? `${data.labelPT} (${data.value})` : ""))
      .catch(() => setError("Erro ao carregar categoria"))
      .finally(() => setLoadingData(false));
  }, [id]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/fixture-categories/${id}`);
      invalidateFixtureCategoriesCache();
      router.push(`${CADASTRO_LIST_HREFS.categorias}?success=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar categoria");
      setLoading(false);
    }
  };

  if (loadingData) {
    return <p className="p-6 text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Desativar categoria</CardTitle>
          <CardDescription>
            Desativar &quot;{label}&quot;? Ela deixa de aparecer em novos cadastros, mas dados antigos
            (jogadores, jogos) mantêm o slug.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" onClick={handleDelete} disabled={loading} className="min-h-[44px]">
              {loading ? "Desativando…" : "Desativar"}
            </Button>
            <Link href={CADASTRO_LIST_HREFS.categorias}>
              <Button variant="outline" disabled={loading} className="min-h-[44px]">
                Cancelar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
