"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Link2, Copy, Loader2 } from "lucide-react";
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

  const load = useCallback(async () => {
    try {
      const [pRes, lRes, uRes] = await Promise.all([
        api.get<EventPhoto[]>(`/events/${eventId}/photos`),
        api.get<GalleryLink[]>(`/events/${eventId}/gallery-links`),
        api.get<UploadToken[]>(`/events/${eventId}/upload-tokens`),
      ]);
      setPhotos(Array.isArray(pRes.data) ? pRes.data : []);
      setLinks(Array.isArray(lRes.data) ? lRes.data : []);
      setUploadTokens(Array.isArray(uRes.data) ? uRes.data : []);
    } catch {
      setPhotos([]);
      setLinks([]);
      setUploadTokens([]);
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
    } catch {
      // ignore
    }
  };

  const handleCreateLink = async () => {
    setCreatingLink(true);
    try {
      const { data } = await api.post<GalleryLink>(`/events/${eventId}/gallery-links`, {
        temporary: linkTemporary,
        expiresInDays: linkTemporary ? linkExpiresDays : undefined,
      });
      setLinks((prev) => [data, ...prev]);
    } catch {
      // ignore
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      await api.delete(`/events/${eventId}/gallery-links/${linkId}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      // ignore
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
        <div className="border-b pb-4">
          <Label className="mb-2 block">Link para fotógrafos (upload na página pública)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Gere um link e compartilhe com os fotógrafos. Eles acessam a página pública e enviam as fotos sem precisar de login.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { data } = await api.post<UploadToken>(`/events/${eventId}/upload-tokens`, {});
                setUploadTokens((prev) => [data, ...prev]);
              } catch {
                // ignore
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
                      } catch {
                        // ignore
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
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
          <Label className="mb-2 block">Gerar link compartilhável</Label>
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
