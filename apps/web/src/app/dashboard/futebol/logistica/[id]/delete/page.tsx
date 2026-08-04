"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface TravelLogisticsItem {
  id: string;
  matchDate: string;
  opponentName?: string | null;
  tenant?: { name: string };
}

export default function DeleteLogisticaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<TravelLogisticsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<TravelLogisticsItem>(`/logistica/${id}`).then(({ data }) => {
      setItem(data ?? null);
    }).catch(() => setItem(null));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/logistica/${id}`);
      router.push("/dashboard/futebol/logistica?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
      setLoading(false);
    }
  };

  if (!item) {
    return (
      <div className="flex items-center justify-center py-12">
        Carregando...
      </div>
    );
  }

  const desc = item.opponentName
    ? `${item.opponentName} — ${formatDateDayMonYear(item.matchDate)}`
    : `Jogo em ${formatDateDayMonYear(item.matchDate)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/futebol/logistica">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Excluir planejamento</h1>
          <p className="text-muted-foreground">{desc}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confirmar exclusão</CardTitle>
          <CardDescription>
            O planejamento de deslocamento será excluído permanentemente. Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}
          <div className="flex gap-4">
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Excluindo..." : "Excluir"}
            </Button>
            <Link href="/dashboard/futebol/logistica">
              <Button variant="outline">Cancelar</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
