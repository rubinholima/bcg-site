"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface SocioPlan {
  id: string;
  name: string;
  slug: string;
}

export default function SocioSociosNovoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<SocioPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [loyaltyTier, setLoyaltyTier] = useState(1);

  useEffect(() => {
    if (!tenantId) {
      setLoadingPlans(false);
      return;
    }
    setLoadingPlans(true);
    api
      .get<SocioPlan[]>(`/socio/plans?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !planId) return;
    setSaving(true);
    try {
      await api.post("/socio/members", {
        tenantId,
        planId,
        name,
        email,
        phone: phone.trim() || undefined,
        cpf: cpf.trim() || undefined,
        loyaltyTier,
      });
      router.push(`/dashboard/socio-torcedor/socios?tenantId=${encodeURIComponent(tenantId)}&success=true`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  if (!canAccessModule("socio_torcedor") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo Sócio Torcedor.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">Voltar ao dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/socio-torcedor/socios?tenantId=${encodeURIComponent(tenantId)}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Novo sócio
          </h1>
          <p className="text-muted-foreground">Cadastre um novo sócio-torcedor</p>
        </div>
      </div>

      {!tenantId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Selecione um clube antes de cadastrar um sócio.</p>
            <Link href="/dashboard/socio-torcedor/socios">
              <Button variant="link" className="mt-2">Voltar aos sócios</Button>
            </Link>
          </CardContent>
        </Card>
      ) : loadingPlans ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Crie pelo menos um plano antes de cadastrar sócios.</p>
            <Link href={`/dashboard/socio-torcedor/planos?tenantId=${encodeURIComponent(tenantId)}`}>
              <Button variant="link" className="mt-2">Ir para planos</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dados do sócio</CardTitle>
            <CardDescription>
              Nome, email e plano — CPF opcional para emissão de ingressos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="planId">Plano *</Label>
                <Select value={planId} onValueChange={setPlanId} required>
                  <SelectTrigger id="planId">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Para ingressos" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loyaltyTier">Nível fidelidade (1–5 estrelas)</Label>
                <Select value={String(loyaltyTier)} onValueChange={(v) => setLoyaltyTier(parseInt(v, 10))}>
                  <SelectTrigger id="loyaltyTier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} estrela(s)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar sócio"}
                </Button>
                <Link href={`/dashboard/socio-torcedor/socios?tenantId=${encodeURIComponent(tenantId)}`}>
                  <Button type="button" variant="outline">Cancelar</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
