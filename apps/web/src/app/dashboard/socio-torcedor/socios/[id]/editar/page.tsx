"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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

interface SocioMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  status: string;
  planId: string;
  loyaltyTier: number;
}

export default function SocioSociosEditarPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<SocioPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState("active");
  const [loyaltyTier, setLoyaltyTier] = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<SocioMember>(`/socio/members/${id}`),
      tenantId ? api.get<SocioPlan[]>(`/socio/plans?tenantId=${encodeURIComponent(tenantId)}`) : Promise.resolve({ data: [] }),
    ])
      .then(([{ data: member }, { data: plansData }]) => {
        setName(member.name);
        setEmail(member.email);
        setPhone(member.phone ?? "");
        setCpf(member.cpf ?? "");
        setPlanId(member.planId);
        setStatus(member.status);
        setLoyaltyTier(member.loyaltyTier ?? 1);
        setPlans(Array.isArray(plansData) ? plansData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/socio/members/${id}`, {
        planId,
        name,
        email,
        phone: phone.trim() || undefined,
        cpf: cpf.trim() || undefined,
        status,
        loyaltyTier,
      });
      router.push(`/dashboard/socio-torcedor/socios?tenantId=${encodeURIComponent(tenantId)}&success=true`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do sócio</CardTitle>
          <CardDescription>Altere plano, contato e status</CardDescription>
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
                <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loyaltyTier">Nível fidelidade (1–5)</Label>
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
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
              <Link href={`/dashboard/socio-torcedor/socios?tenantId=${encodeURIComponent(tenantId)}`}>
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
