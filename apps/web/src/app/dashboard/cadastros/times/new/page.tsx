"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

export default function NewTimePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (data?.url) setLogoUrl(data.url);
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post("/visiting-teams", {
        name: name.trim(),
        logoUrl: logoUrl.trim() || undefined,
      });
      router.push("/dashboard/cadastros/times?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar time");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cadastros/times">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Time</h1>
          <p className="text-muted-foreground">
            Adicione um time adversário (nome e logo)
          </p>
        </div>
      </div>

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
                {loading ? "Criando..." : "Criar Time"}
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
    </div>
  );
}
