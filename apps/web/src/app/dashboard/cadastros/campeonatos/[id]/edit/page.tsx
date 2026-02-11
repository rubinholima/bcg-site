"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function EditCampeonatoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    async function loadCampeonato() {
      try {
        const { data } = await api.get<{ name: string }>(`/championships/${id}`);
        setName(data?.name ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar campeonato");
      } finally {
        setLoadingData(false);
      }
    }
    loadCampeonato();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/championships/${id}`, { name: name.trim() });
      router.push("/dashboard/cadastros/campeonatos?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar campeonato");
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cadastros/campeonatos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Campeonato</h1>
          <p className="text-muted-foreground">
            Atualize as informações do campeonato
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Campeonato</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para atualizar o campeonato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campeonato Paulista"
                disabled={loading}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Link href="/dashboard/cadastros/campeonatos">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
