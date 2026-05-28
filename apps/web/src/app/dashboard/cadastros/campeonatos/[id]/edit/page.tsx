"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { StandingsFormulaEditor } from "@/components/dashboard/StandingsFormulaEditor";
import { api } from "@/lib/api";

export default function EditCampeonatoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [standingsFormula, setStandingsFormula] = useState("");
  const [standingsFormulaName, setStandingsFormulaName] = useState("");
  const [logoRefreshKey, setLogoRefreshKey] = useState(0);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sizeKey", "competitions");
      const res = await fetch("/api/media", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        setLogoUrl(data.url);
        setLogoRefreshKey((k) => k + 1);
      }
    } finally {
      e.target.value = "";
    }
  };

  useEffect(() => {
    async function loadCampeonato() {
      try {
        const { data } = await api.get<{ name: string; logoUrl?: string; standingsFormula?: string; standingsFormulaName?: string }>(`/championships/${id}`);
        setName(data?.name ?? "");
        setLogoUrl(data?.logoUrl ?? "");
        setStandingsFormula(data?.standingsFormula ?? "");
        setStandingsFormulaName(data?.standingsFormulaName ?? "");
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
      await api.patch(`/championships/${id}`, {
        name: name.trim(),
        logoUrl: logoUrl.trim() || undefined,
        standingsFormula: standingsFormula.trim() || undefined,
        standingsFormulaName: standingsFormulaName.trim() || undefined,
      });
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

            <div className="space-y-2">
              <Label>Logo da competição</Label>
              <div className="flex flex-wrap items-center gap-2">
                <MediaPicker
                  label=""
                  sizeKey="card"
                  folder="logos"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  placeholder="Escolher da pasta de logos"
                  refreshTrigger={logoRefreshKey}
                />
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleUploadLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  Enviar novo logo (pasta logos/competitions)
                </Button>
              </div>
              <Input
                placeholder="Ou cole a URL manualmente"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Logos ficam na pasta logos/ do S3 (logos/competitions/). Usado na tabela de classificação.
              </p>
            </div>

            <StandingsFormulaEditor
              formula={standingsFormula}
              formulaName={standingsFormulaName}
              onFormulaChange={setStandingsFormula}
              onFormulaNameChange={setStandingsFormulaName}
              disabled={loading}
            />

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
