"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { invalidateFixtureCategoriesCache } from "@/hooks/useFixtureCategories";
import { CADASTRO_LIST_HREFS, finishCadastroSave } from "@/lib/cadastros-navigation";

export default function NewCategoriaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [labelPT, setLabelPT] = useState("");
  const [labelEN, setLabelEN] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ id: string }>("/fixture-categories", {
        value: value.trim().toLowerCase(),
        labelPT: labelPT.trim(),
        labelEN: labelEN.trim(),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      });
      invalidateFixtureCategoriesCache();
      finishCadastroSave(router, CADASTRO_LIST_HREFS.categorias);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      if (Array.isArray(msg)) setError(msg.join(", "));
      else if (typeof msg === "string") setError(msg);
      else setError(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="min-h-[44px]">
        <Link href={CADASTRO_LIST_HREFS.categorias}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
          <CardDescription>
            O slug (valor interno) não pode ser alterado depois — use minúsculas (ex.: sub16, principal).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="value">Slug interno *</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="sub16"
                className="min-h-[44px] font-mono"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="labelPT">Nome (PT) *</Label>
              <Input
                id="labelPT"
                value={labelPT}
                onChange={(e) => setLabelPT(e.target.value)}
                placeholder="Sub-16"
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
                placeholder="U-16"
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="min-h-[44px] w-full sm:w-auto">
              {loading ? "Salvando…" : "Salvar categoria"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
