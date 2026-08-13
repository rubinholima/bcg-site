"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: string | number;
  perks?: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
}

export default function SocioPlanosEditarPage() {
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [ticketDiscount, setTicketDiscount] = useState("");
  const [merchandiseDiscount, setMerchandiseDiscount] = useState("");
  const [foodDiscount, setFoodDiscount] = useState("");
  const [earlyTicketHours, setEarlyTicketHours] = useState("");
  const [stadiumTour, setStadiumTour] = useState(false);
  const [exclusiveContent, setExclusiveContent] = useState(false);
  const [welcomePack, setWelcomePack] = useState(false);
  const [meetGreet, setMeetGreet] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Plan>(`/socio/plans/${id}`)
      .then(({ data }) => {
        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description ?? "");
        const p = typeof data.priceMonthly === "string" ? parseFloat(data.priceMonthly) : data.priceMonthly;
        setPriceMonthly(Number.isNaN(p) ? "" : String(p));
        const perks = data.perks ?? {};
        setTicketDiscount(String((perks.ticketDiscountPercent as number) ?? ""));
        setMerchandiseDiscount(String((perks.merchandiseDiscountPercent as number) ?? ""));
        setFoodDiscount(String((perks.foodDiscountPercent as number) ?? ""));
        setEarlyTicketHours(String((perks.earlyTicketHours as number) ?? ""));
        setStadiumTour(!!perks.stadiumTour);
        setExclusiveContent(!!perks.exclusiveContent);
        setWelcomePack(!!perks.welcomePack);
        setMeetGreet(!!perks.meetGreet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const perks: Record<string, unknown> = {};
      const ti = parseInt(ticketDiscount, 10);
      if (!Number.isNaN(ti) && ti > 0) perks.ticketDiscountPercent = ti;
      const me = parseInt(merchandiseDiscount, 10);
      if (!Number.isNaN(me) && me > 0) perks.merchandiseDiscountPercent = me;
      const fo = parseInt(foodDiscount, 10);
      if (!Number.isNaN(fo) && fo > 0) perks.foodDiscountPercent = fo;
      const ea = parseInt(earlyTicketHours, 10);
      if (!Number.isNaN(ea) && ea > 0) perks.earlyTicketHours = ea;
      if (stadiumTour) perks.stadiumTour = true;
      if (exclusiveContent) perks.exclusiveContent = true;
      if (welcomePack) perks.welcomePack = true;
      if (meetGreet) perks.meetGreet = true;
      await api.patch(`/socio/plans/${id}`, {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description: description || undefined,
        priceMonthly: parseFloat(priceMonthly) || 0,
        perks: Object.keys(perks).length ? perks : undefined,
      });
      notifySaved();
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
          <CardTitle>Dados do plano</CardTitle>
          <CardDescription>Altere nome, preço e perks</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do plano</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Mensalidade (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(e.target.value)}
                required
              />
            </div>
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">Perks</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Desconto ingressos (%)</Label>
                  <Input type="number" min="0" max="100" value={ticketDiscount} onChange={(e) => setTicketDiscount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto loja (%)</Label>
                  <Input type="number" min="0" max="100" value={merchandiseDiscount} onChange={(e) => setMerchandiseDiscount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto alimentação (%)</Label>
                  <Input type="number" min="0" max="100" value={foodDiscount} onChange={(e) => setFoodDiscount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade ingressos (h)</Label>
                  <Input type="number" min="0" value={earlyTicketHours} onChange={(e) => setEarlyTicketHours(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={stadiumTour} onChange={(e) => setStadiumTour(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm">Tour no estádio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={exclusiveContent} onChange={(e) => setExclusiveContent(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm">Conteúdo exclusivo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={welcomePack} onChange={(e) => setWelcomePack(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm">Kit boas-vindas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={meetGreet} onChange={(e) => setMeetGreet(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm">Meet & greet</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
              <Link href={`/dashboard/socio-torcedor/planos?tenantId=${encodeURIComponent(tenantId)}`}>
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <SaveSuccessModal />
    </div>
  );
}
