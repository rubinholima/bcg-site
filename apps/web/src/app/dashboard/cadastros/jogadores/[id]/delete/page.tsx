"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function DeleteJogadorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<{ name: string }>(`/players/${id}`);
        setName(data?.name ?? "");
      } catch {
        setError("Erro ao carregar jogador");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/players/${id}`);
      router.push("/dashboard/cadastros/jogadores?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
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
        <Link href="/dashboard/cadastros/jogadores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Excluir Jogador</h1>
          <p className="text-muted-foreground">
            Confirme a exclusão do jogador
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confirmar exclusão</CardTitle>
          <CardDescription>
            Tem certeza que deseja excluir o jogador &quot;{name}&quot;? Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Excluindo..." : "Excluir"}
            </Button>
            <Link href="/dashboard/cadastros/jogadores">
              <Button variant="outline" disabled={loading}>
                Cancelar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
