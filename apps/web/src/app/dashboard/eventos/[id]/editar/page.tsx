"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Tenant } from "@/types/tenant";
import { LogoUploadWithName } from "@/components/dashboard/LogoUploadWithName";
import { CompetitionFormatEditor } from "@/components/dashboard/CompetitionFormatEditor";
import { EventPhotosCard } from "@/components/dashboard/EventPhotosCard";
import type { CompetitionFormat } from "@/lib/competition-formats";
import { emptyFormat } from "@/lib/competition-formats";

export default function EditarEventoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { canAccessModule, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    organizer: string;
    tenantId: string | null;
    tenantName?: string | null;
    category: string;
    startDate: string | null;
    endDate: string | null;
    logoUrl: string | null;
    competitionFormat: CompetitionFormat | null;
    status: string;
  } | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canAccess = canAccessModule("eventos");

  useEffect(() => {
    if (!canAccess || !id) return;
    let cancelled = false;
    Promise.all([
      api.get(`/events/${id}`),
      api.get<Tenant[]>("/tenants"),
    ])
      .then(([evRes, tenRes]) => {
        if (cancelled) return;
        const ev = evRes.data as typeof event;
        setEvent(ev);
        setTenants(Array.isArray(tenRes.data) ? tenRes.data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar evento.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccess, id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/events/${id}`, {
        name: event.name,
        description: event.description ?? undefined,
        organizer: event.organizer,
        tenantId: event.organizer === "tenant" ? event.tenantId : null,
        category: event.category,
        startDate: event.startDate ?? undefined,
        endDate: event.endDate ?? undefined,
        logoUrl: event.logoUrl ?? undefined,
        competitionFormat: event.category === "football" ? (event.competitionFormat ?? emptyFormat("campeonato")) : null,
        status: event.status,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : "Erro ao salvar";
      setError(msg ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !canAccess) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Você não tem acesso ao módulo Eventos.</p>
      </div>
    );
  }

  if (loading || !event) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/eventos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <p className="text-muted-foreground">
              Slug: {event.slug}
              {event.status === "published" && (
                <>
                  {" — "}
                  <a href={`/eventos/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Ver página <ExternalLink className="inline h-3 w-3" />
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            Salvo com sucesso.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dados do evento</CardTitle>
            <CardDescription>Metadados e informações gerais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={event.name}
                  onChange={(e) => setEvent({ ...event, name: e.target.value })}
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={event.status} onValueChange={(v) => setEvent({ ...event, status: v })}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organizador</Label>
                <Select value={event.organizer} onValueChange={(v) => setEvent({ ...event, organizer: v })}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo (BCG)</SelectItem>
                    <SelectItem value="tenant">Empresa / Clube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {event.organizer === "tenant" && (
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select
                    value={event.tenantId ?? ""}
                    onValueChange={(v) => setEvent({ ...event, tenantId: v || null })}
                  >
                    <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={event.category} onValueChange={(v) => setEvent({ ...event, category: v })}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football">Futebol</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={event.startDate ?? ""}
                  onChange={(e) => setEvent({ ...event, startDate: e.target.value || null })}
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={event.endDate ?? ""}
                  onChange={(e) => setEvent({ ...event, endDate: e.target.value || null })}
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                />
              </div>
            </div>
            {event.category === "football" ? (
              <div>
                <CompetitionFormatEditor
                  value={event.competitionFormat ?? null}
                  onChange={(v) => setEvent((prev) => (prev ? { ...prev, competitionFormat: v } : null))}
                  disabled={saving}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Logo do evento</Label>
              <LogoUploadWithName
                value={event.logoUrl ?? ""}
                onChange={(url) => setEvent((prev) => (prev ? { ...prev, logoUrl: url || null } : null))}
                scope={`event:${id}`}
                displayNameAuto={event.name?.trim() || "Logo Evento"}
                sectionLabel="Logo"
                urlPlaceholder="Ou colar URL da foto"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                value={event.description ?? ""}
                onChange={(e) => setEvent({ ...event, description: e.target.value || null })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background"
              />
            </div>
          </CardContent>
        </Card>

        <EventPhotosCard eventId={id} />

        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus />}
            Salvar
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/eventos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
