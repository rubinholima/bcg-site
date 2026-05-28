"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { useAuth } from "@/context/AuthContext";

export default function DeleteEmpresaPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Tenant | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<Tenant>(`/tenants/${id}`);
        setEmpresa(data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar empresa");
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
      await api.delete(`/tenants/${id}`);
      router.push("/dashboard/empresas?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir empresa");
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

  if (!empresa) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-destructive">
          <p>{error ?? "Empresa não encontrada."}</p>
          <Link href="/dashboard/empresas">
            <Button variant="outline" className="mt-4">
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Somente super admin pode excluir empresas. Esta área é apenas de listagem para os demais usuários.</p>
          <Link href="/dashboard/empresas">
            <Button variant="outline" className="mt-4">
              Voltar para lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              Você está prestes a excluir a empresa: <strong>{empresa.name}</strong> ({empresa.slug})
            </p>
            <p className="text-sm text-muted-foreground">
              Todos os dados vinculados a esta empresa podem ser afetados.
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
              <Link href="/dashboard/empresas">
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
