"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface DeleteImpact {
  counts?: {
    legalDocuments: number;
    nutritionAssessments: number;
    assignedAssets: number;
    supplementGuides: number;
    medicalHistoryEntries: number;
    psychologicalAssessments: number;
    onlineConsultations: number;
    evaluations: number;
  };
  legalDocuments?: number;
  nutritionAssessments?: number;
  assignedAssets?: number;
  supplementGuides?: number;
  medicalHistoryEntries?: number;
  psychologicalAssessments?: number;
  onlineConsultations?: number;
  evaluations?: number;
  hasIntegrations?: boolean;
}

function impactItems(impact: DeleteImpact): { label: string; count: number }[] {
  const c = impact.counts ?? impact;
  const items: { label: string; count: number }[] = [];
  const ld = c.legalDocuments ?? (c as Record<string, number>).legalDocuments ?? 0;
  const na = c.nutritionAssessments ?? (c as Record<string, number>).nutritionAssessments ?? 0;
  const aa = c.assignedAssets ?? (c as Record<string, number>).assignedAssets ?? 0;
  const sg = c.supplementGuides ?? (c as Record<string, number>).supplementGuides ?? 0;
  const mh = c.medicalHistoryEntries ?? (c as Record<string, number>).medicalHistoryEntries ?? (c as Record<string, number>).medicalHistory ?? 0;
  const pa = c.psychologicalAssessments ?? (c as Record<string, number>).psychologicalAssessments ?? 0;
  const oc = c.onlineConsultations ?? (c as Record<string, number>).onlineConsultations ?? 0;
  const ev = c.evaluations ?? (c as Record<string, number>).evaluations ?? 0;
  if (ld > 0) items.push({ label: "Documentos jurídicos", count: ld });
  if (na > 0) items.push({ label: "Avaliações nutrição", count: na });
  if (aa > 0) items.push({ label: "Patrimônio atribuído", count: aa });
  if (sg > 0) items.push({ label: "Guias de suplementação", count: sg });
  if (mh > 0) items.push({ label: "Histórico médico", count: mh });
  if (pa > 0) items.push({ label: "Avaliações psicológicas", count: pa });
  if (oc > 0) items.push({ label: "Consultas online", count: oc });
  if (ev > 0) items.push({ label: "Avaliações diretoria", count: ev });
  return items;
}

export default function DeleteJogadorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [impact, setImpact] = useState<DeleteImpact | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [playerRes, impactRes] = await Promise.all([
          api.get<{ name: string }>(`/players/${id}`),
          api.get<DeleteImpact>(`/players/${id}/delete-impact`).catch(() => ({ data: null })),
        ]);
        setName(playerRes.data?.name ?? "");
        setImpact(impactRes.data ?? null);
      } catch {
        setError("Erro ao carregar atleta");
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
          <h1 className="text-3xl font-bold tracking-tight">Excluir Atleta</h1>
          <p className="text-muted-foreground">
            Confirme a exclusão do atleta
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confirmar exclusão</CardTitle>
          <CardDescription>
            Tem certeza que deseja excluir o atleta &quot;{name}&quot;? Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {impact && (impact.hasIntegrations ?? (impact.counts && Object.values(impact.counts).some((v) => (v ?? 0) > 0))) && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <div className="flex gap-2 text-amber-600 dark:text-amber-400 font-medium mb-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Este atleta possui integrações em outros departamentos
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Ao excluir, os seguintes dados serão removidos ou desvinculados permanentemente:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {impactItems(impact).map((item) => (
                  <li key={item.label}>
                    <span className="font-medium">{item.label}:</span> {item.count} {item.count === 1 ? "registro" : "registros"}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 font-medium">
                Tem certeza que deseja continuar?
              </p>
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
