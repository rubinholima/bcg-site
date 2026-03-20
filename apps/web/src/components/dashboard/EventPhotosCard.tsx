"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Link2, Copy, Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";

type EventPhoto = { id: string; url: string; caption: string | null; sortOrder: number };
type GalleryLink = { id: string; token: string; url: string; expiresAt: string | null; isPermanent: boolean; createdAt: string };
type UploadToken = { id: string; token: string; url: string; expiresAt: string | null; createdAt: string };

export function EventPhotosCard({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [links, setLinks] = useState<GalleryLink[]>([]);
  const [uploadTokens, setUploadTokens] = useState<UploadToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkTemporary, setLinkTemporary] = useState(true);
  const [linkExpiresDays, setLinkExpiresDays] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setCardError(null);
    try {
      const [pRes, lRes, uRes] = await Promise.all([
        api.get<EventPhoto[]>(`/events/${eventId}/photos`),
        api.get<GalleryLink[]>(`/events/${eventId}/gallery-links`),
        api.get<UploadToken[]>(`/events/${eventId}/upload-tokens`),
      ]);
      setPhotos(Array.isArray(pRes.data) ? pRes.data : []);
      setLinks(Array.isArray(lRes.data) ? lRes.data : []);
      setUploadTokens(Array.isArray(uRes.data) ? uRes.data : []);
    } catch (e) {
      setPhotos([]);
      setLinks([]);
      setUploadTokens([]);
      setCardError(e instanceof Error ? e.message : "Erro ao carregar galeria.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await api.delete(`/events/${eventId}/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setCardError(null);
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Não foi possível remover a foto.");
    }
  };

  const handleDashboardUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setCardError("Envie um arquivo de imagem (JPG, PNG, WebP…).");
      return;
    }
    setUploading(true);
    setCardError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.postForm<EventPhoto>(`/events/${eventId}/photos`, form);
      await load();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateLink = async () => {
    setCreatingLink(true);
    setCardError(null);
    try {
      const { data } = await api.post<GalleryLink>(`/events/${eventId}/gallery-links`, {
        temporary: linkTemporary,
        expiresInDays: linkTemporary ? linkExpiresDays : undefined,
      });
      setLinks((prev) => [data, ...prev]);
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Não foi possível gerar o link.");
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      await api.delete(`/events/${eventId}/gallery-links/${linkId}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setCardError(null);
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Não foi possível revogar o link.");
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Galeria de fotos</CardTitle>
          <CardDescription>Carregando…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galeria de fotos</CardTitle>
        <CardDescription>
          Gere link de upload para fotógrafos enviarem fotos pela página pública. O botão aparecerá na página do evento. Gere link de galeria para jornalistas baixarem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {cardError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {cardError}
          </div>
        )}

        <div>
          <Label className="mb-2 block">Upload pelo dashboard</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Envie fotos diretamente (até 15 MB por arquivo). As mesmas imagens aparecem na página pública e nos links de galeria.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            id={`event-photos-file-${eventId}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleDashboardUpload(f);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando…" : "Escolher imagem"}
          </Button>
        </div>

        <div className="border-b pb-4">
          <Label className="mb-2 block">Link para fotógrafos (upload na página pública)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Gere um link e compartilhe com fotógrafos e assessoria. A página permite{" "}
            <strong className="text-foreground/90">selecionar várias fotos de uma vez</strong> no celular ou no computador
            (central de envio em lote).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              setCardError(null);
              try {
                const { data } = await api.post<UploadToken>(`/events/${eventId}/upload-tokens`, {});
                setUploadTokens((prev) => [data, ...prev]);
              } catch (e) {
                setCardError(e instanceof Error ? e.message : "Não foi possível gerar o link de upload.");
              }
            }}
            className="gap-2 mb-2"
          >
            <Link2 className="h-4 w-4" />
            Gerar link de upload
          </Button>
          {uploadTokens.length > 0 && (
            <ul className="space-y-2 mt-2">
              {uploadTokens.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                  <code className="flex-1 truncate text-muted-foreground">{t.url}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(t.url);
                      setCopiedId(`upload-${t.id}`);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    title="Copiar"
                  >
                    {copiedId === `upload-${t.id}` ? (
                      <span className="text-xs text-emerald-500">Copiado</span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await api.delete(`/events/${eventId}/upload-tokens/${t.id}`);
                        setUploadTokens((prev) => prev.filter((u) => u.id !== t.id));
                        setCardError(null);
                      } catch (e) {
                        setCardError(e instanceof Error ? e.message : "Não foi possível revogar o token.");
                      }
                    }}
                    title="Revogar"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {photos.length > 0 && (
          <div>
            <Label className="mb-2 block">{photos.length} foto(s)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative group aspect-square rounded overflow-hidden bg-muted">
                  <img
                    src={getPublicImageUrl(p.url) || p.url}
                    alt={p.caption ?? ""}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(p.id)}
                    className="absolute top-1 right-1 p-1 rounded bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <Label className="mb-2 block">Link para imprensa (galeria + download em lote)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Jornalistas usam <strong className="text-foreground/90">/imprensa</strong>: release, logo do torneio (a do
            cadastro do evento publicado) e só então colam este link ou o código para baixar fotos. URL direto da galeria
            também vale. Ajuste o slug do evento na página com <code className="text-[10px]">NEXT_PUBLIC_IMPRENSA_EVENT_SLUG</code>{" "}
            se não for <code className="text-[10px]">coffee-tournament</code>.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="link-permanent"
                checked={!linkTemporary}
                onChange={() => setLinkTemporary(false)}
              />
              <Label htmlFor="link-permanent" className="font-normal cursor-pointer">Permanente</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="link-temporary"
                checked={linkTemporary}
                onChange={() => setLinkTemporary(true)}
              />
              <Label htmlFor="link-temporary" className="font-normal cursor-pointer">Temporário</Label>
            </div>
            {linkTemporary && (
              <div className="flex items-center gap-2">
                <Label htmlFor="expires-days" className="font-normal">Expira em</Label>
                <Input
                  id="expires-days"
                  type="number"
                  min={1}
                  max={90}
                  value={linkExpiresDays}
                  onChange={(e) => setLinkExpiresDays(Math.max(1, parseInt(e.target.value, 10) || 7))}
                  className="w-16 text-foreground"
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            )}
            <Button onClick={handleCreateLink} disabled={creatingLink} size="sm" className="gap-2">
              {creatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Gerar link
            </Button>
          </div>
        </div>

        {links.length > 0 && (
          <div>
            <Label className="mb-2 block">Links gerados</Label>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                  <code className="flex-1 truncate text-muted-foreground">{l.url}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyUrl(l.url, l.id)}
                    title="Copiar"
                  >
                    {copiedId === l.id ? (
                      <span className="text-xs text-emerald-500">Copiado</span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeLink(l.id)}
                    title="Revogar"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {l.isPermanent ? "Permanente" : l.expiresAt ? `Expira ${new Date(l.expiresAt).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
