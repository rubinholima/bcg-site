"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function EditEstadioPage() {
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    async function loadEstadio() {
      try {
        const { data } = await api.get<{ name: string; city?: string; country?: string; address?: string }>(`/stadiums/${id}`);
        setName(data?.name ?? "");
        setCity(data?.city ?? "");
        setCountry(data?.country ?? "");
        setAddress(data?.address ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar estádio");
      } finally {
        setLoadingData(false);
      }
    }
    loadEstadio();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/stadiums/${id}`, {
        name: name.trim(),
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        address: address.trim() || undefined,
      });
      notifySaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar estádio");
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
          <CardTitle>Informações do Estádio</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para atualizar o estádio
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
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ex: Brasil"
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
                {loading ? "Salvando..." : "Salvar Alterações"}
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
      <SaveSuccessModal />
    </div>
  );
}
