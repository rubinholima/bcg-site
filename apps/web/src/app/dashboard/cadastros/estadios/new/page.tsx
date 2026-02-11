"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function NewEstadioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post("/stadiums", {
        name: name.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });
      router.push("/dashboard/cadastros/estadios?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar estádio");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cadastros/estadios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Estádio</h1>
          <p className="text-muted-foreground">
            Adicione um novo estádio
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Estádio</CardTitle>
          <CardDescription>
            Preencha os dados do estádio
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
                placeholder="Ex: Allianz Parque"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 123"
                disabled={loading}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Estádio"}
              </Button>
              <Link href="/dashboard/cadastros/estadios">
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
