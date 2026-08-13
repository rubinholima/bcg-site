"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

export default function EditTimePage() {
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoRefreshKey, setLogoRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadTime() {
      try {
        const { data } = await api.get<{ name: string; logoUrl?: string }>(`/visiting-teams/${id}`);
        setName(data?.name ?? "");
        setLogoUrl(data?.logoUrl ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar time");
      } finally {
        setLoadingData(false);
      }
    }
    loadTime();
  }, [id]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sizeKey", "external_logos");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/visiting-teams/${id}`, {
        name: name.trim(),
        logoUrl: logoUrl.trim() || undefined,
      });
      notifySaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar time");
    } finally {
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
          <CardTitle>Informações do Time</CardTitle>
          <CardDescription>
            Os logos são salvos na pasta de logos do sistema
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
                placeholder="Ex: Corinthians"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex flex-wrap items-center gap-2">
                <MediaPicker
                  sizeKey="card"
                  folder="logos"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  placeholder="Escolher da pasta de logos"
                  refreshTrigger={logoRefreshKey}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleUploadLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Enviar novo logo (pasta visitantes)
                </Button>
              </div>
              <Input
                className="mt-1"
                placeholder="Ou colar URL do logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Link href="/dashboard/cadastros/times">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <SaveSuccessModal />
    </div>
  );
}
