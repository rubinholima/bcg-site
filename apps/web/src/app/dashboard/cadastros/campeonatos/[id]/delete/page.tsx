"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function DeleteCampeonatoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function loadCampeonato() {
      try {
        const { data } = await api.get<{ name: string }>(`/championships/${id}`);
        setName(data?.name ?? "");
      } catch {
        setError("Erro ao carregar campeonato");
      } finally {
        setLoadingData(false);
      }
    }
    loadCampeonato();
  }, [id]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/championships/${id}`);
      router.push("/dashboard/cadastros/campeonatos?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir campeonato");
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
      <Card>
        <CardHeader>
          <CardTitle>Confirmar exclusão</CardTitle>
          <CardDescription>
            Tem certeza que deseja excluir o campeonato &quot;{name}&quot;? Esta ação não pode ser desfeita.
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
            <Link href="/dashboard/cadastros/campeonatos">
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
