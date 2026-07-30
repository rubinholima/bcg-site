"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function DeleteFisioterapeutaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    api
      .get<{ name: string; role: string }>(`/medical-staff/${id}`)
      .then(({ data }) => {
        if (data?.role !== "fisioterapeuta") {
          setError("Profissional não é fisioterapeuta.");
          return;
        }
        setName(data.name ?? "");
      })
      .catch(() => setError("Erro ao carregar profissional."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/medical-staff/${id}`);
      router.push("/dashboard/saude/fisioterapeutas?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
      setLoading(false);
    }
  };

  if (loadingData) {
    return <p className="py-8 text-center text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/saude/fisioterapeutas" className="text-sm text-muted-foreground hover:text-foreground">
        ← Fisioterapeutas
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Confirmar exclusão</CardTitle>
          <CardDescription>
            Excluir o fisioterapeuta &quot;{name}&quot;? Atendimentos já registrados mantêm o nome salvo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" className="min-h-[44px]" onClick={() => void handleDelete()} disabled={loading}>
              {loading ? "Excluindo…" : "Excluir"}
            </Button>
            <Link href="/dashboard/saude/fisioterapeutas">
              <Button variant="outline" className="min-h-[44px]" disabled={loading}>Cancelar</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
