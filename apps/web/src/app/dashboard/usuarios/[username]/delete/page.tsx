"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserListItem } from "@/types/user";

export default function DeleteUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const username = decodeURIComponent(params.username as string);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setError(res.status === 404 ? "Usuário não encontrado." : "Erro ao carregar usuário.");
          setLoadingData(false);
          return;
        }
        const data: UserListItem = await res.json();
        setUser(data);
      } catch {
        setError("Erro ao carregar usuário.");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [username]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao excluir usuário");
      }
      router.push("/dashboard/usuarios?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir usuário");
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

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-destructive">
          <p>{error ?? "Usuário não encontrado."}</p>
          <Link href="/dashboard/usuarios">
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
        <Link href="/dashboard/usuarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Excluir Usuário</h1>
          <p className="text-muted-foreground">
            Remover usuário do Cognito (e do banco local)
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
            Esta ação não pode ser desfeita. O usuário será removido do Cognito e não poderá mais fazer login.
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
              Você está prestes a excluir o usuário: <strong>{user.email}</strong>
              {user.name ? ` (${user.name})` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              O usuário será removido do User Pool do Cognito e do banco de dados local.
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
              <Link href="/dashboard/usuarios">
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
