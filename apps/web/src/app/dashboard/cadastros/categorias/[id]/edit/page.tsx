"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { invalidateFixtureCategoriesCache } from "@/hooks/useFixtureCategories";

export default function EditCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [labelPT, setLabelPT] = useState("");
  const [labelEN, setLabelEN] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);

  useEffect(() => {
    api
      .get<{ value: string; labelPT: string; labelEN: string; sortOrder: number; active: boolean }>(
        `/fixture-categories/${id}`,
      )
      .then(({ data }) => {
        if (!data) return;
        setValue(data.value);
        setLabelPT(data.labelPT);
        setLabelEN(data.labelEN);
        setSortOrder(String(data.sortOrder ?? 0));
        setActive(data.active !== false);
      })
      .catch(() => setError("Erro ao carregar categoria"))
      .finally(() => setLoadingData(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/fixture-categories/${id}`, {
        labelPT: labelPT.trim(),
        labelEN: labelEN.trim(),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        active,
      });
      invalidateFixtureCategoriesCache();
      router.push("/dashboard/cadastros/categorias?success=true");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      if (Array.isArray(msg)) setError(msg.join(", "));
      else if (typeof msg === "string") setError(msg);
      else setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <p className="text-muted-foreground p-6">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="min-h-[44px]">
        <Link href="/dashboard/cadastros/categorias">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Editar categoria</CardTitle>
          <CardDescription>
            Slug <span className="font-mono">{value}</span> — fixo após criação (referência em jogos, FMF, site).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="labelPT">Nome (PT) *</Label>
              <Input
                id="labelPT"
                value={labelPT}
                onChange={(e) => setLabelPT(e.target.value)}
                className="min-h-[44px]"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="labelEN">Nome (EN) *</Label>
              <Input
                id="labelEN"
                value={labelEN}
                onChange={(e) => setLabelEN(e.target.value)}
                className="min-h-[44px]"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sortOrder">Ordem na listagem</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="min-h-[44px] text-foreground"
              />
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
              Categoria ativa (visível no app)
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="min-h-[44px] w-full sm:w-auto">
              {loading ? "Salvando…" : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
