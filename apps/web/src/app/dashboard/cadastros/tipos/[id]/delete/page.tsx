"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { TenantKind } from "@/types/tenant-kind";

export default function DeleteTipoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TenantKind | null>(null);

  useEffect(() => {
    async function loadTipo() {
      try {
        const { data } = await api.get<TenantKind>(`/tenant-kinds/${id}`);
        setTipo(data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar tipo");
      } finally {
        setLoadingData(false);
      }
    }
    loadTipo();
  }, [id]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/tenant-kinds/${id}`);
      router.push("/dashboard/cadastros/tipos?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir tipo");
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

  if (!tipo) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-destructive">
          <p>Tipo não encontrado.</p>
          <Link href="/dashboard/cadastros/tipos">
            <Button variant="outline" className="mt-4">
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cadastros/tipos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Excluir Tipo</h1>
          <p className="text-muted-foreground">
            Confirme a exclusão do tipo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Atenção
          </CardTitle>
          <CardDescription>
            Esta ação não pode ser desfeita
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p>
              Você está prestes a excluir o tipo: <strong>{tipo.name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Certifique-se de que nenhuma empresa está usando este tipo antes de excluir.
            </p>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
              <Link href="/dashboard/cadastros/tipos">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
