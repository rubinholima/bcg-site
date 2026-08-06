"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { getPhotoDisplayName } from "@/lib/utils";
import type { MatchReferee } from "@/types/match-referee";

export function MatchRefereeForm({
  mode,
  refereeId,
  onSaved,
  cancelHref,
}: {
  mode: "create" | "edit";
  refereeId?: string;
  onSaved: (id: string) => void;
  cancelHref: string;
}) {
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    federation: "",
    licenseNumber: "",
    phone: "",
    email: "",
    notes: "",
    active: true,
  });

  useEffect(() => {
    if (mode !== "edit" || !refereeId) return;
    api
      .get<MatchReferee>(`/match-referees/${refereeId}`)
      .then(({ data }) => {
        setForm({
          name: data.name ?? "",
          federation: data.federation ?? "",
          licenseNumber: data.licenseNumber ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          notes: data.notes ?? "",
          active: data.active !== false,
        });
        setPhotoUrl(data.photoUrl ?? "");
      })
      .catch(() => setError("Erro ao carregar árbitro."))
      .finally(() => setLoading(false));
  }, [mode, refereeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && form.name.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "comissao");
        formData.append(
          "displayName",
          getPhotoDisplayName(form.name, "Árbitros"),
        );
        const res = await fetch("/api/media", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = (await res.json()) as {
          url?: string;
          message?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setSaving(false);
          return;
        }
        if (data?.url) finalPhotoUrl = data.url;
      }

      const payload = {
        name: form.name.trim(),
        federation: form.federation.trim() || undefined,
        licenseNumber: form.licenseNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        photoUrl: finalPhotoUrl,
        active: form.active,
      };

      if (mode === "create") {
        const { data } = await api.post<MatchReferee>("/match-referees", payload);
        onSaved(data.id);
      } else if (refereeId) {
        await api.patch(`/match-referees/${refereeId}`, payload);
        onSaved(refereeId);
      }
    } catch {
      setError("Não foi possível salvar o árbitro.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Novo árbitro" : "Editar árbitro"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Foto</Label>
            <PhotoUploadWithName
              sizeKey="comissao"
              value={photoUrl}
              onChange={setPhotoUrl}
              disabled={saving}
              deferredUpload
              onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
              pendingFile={pendingPhotoFile}
              requireNameToUpload={form.name}
              displayNameAuto={getPhotoDisplayName(form.name, "Árbitros") || undefined}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              className="min-h-[44px] uppercase text-foreground"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="federation">Federação</Label>
            <Input
              id="federation"
              className="min-h-[44px] uppercase text-foreground"
              value={form.federation}
              onChange={(e) => setForm((f) => ({ ...f, federation: e.target.value }))}
              placeholder="CBF / FMF…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Registro</Label>
            <Input
              id="licenseNumber"
              className="min-h-[44px] uppercase text-foreground"
              value={form.licenseNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, licenseNumber: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              className="min-h-[44px] text-foreground"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              className="min-h-[44px] text-foreground"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              className="min-h-[44px] text-foreground"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Ativo (aparece na busca do Press Kit)
          </label>
          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" className="min-h-[44px]" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="outline" className="min-h-[44px]" asChild>
              <Link href={cancelHref}>Cancelar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
