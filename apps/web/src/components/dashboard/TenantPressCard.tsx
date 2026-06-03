"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Images, Link2, Copy, Loader2, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssessoriaCollapsible } from "@/components/dashboard/AssessoriaCollapsible";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";

type PressPhoto = { id: string; url: string; caption: string | null; matchLabel: string | null; sortOrder: number };
type GalleryLink = { id: string; token: string; url: string; expiresAt: string | null; isPermanent: boolean; createdAt: string };
type UploadToken = { id: string; token: string; url: string; expiresAt: string | null; createdAt: string };

export function TenantPressCard({
  tenantId,
  clubSlug: _clubSlug,
  embedded = false,
}: {
  tenantId: string;
  clubSlug?: string;
  embedded?: boolean;
}) {
  const [photos, setPhotos] = useState<PressPhoto[]>([]);
  const [links, setLinks] = useState<GalleryLink[]>([]);
  const [uploadTokens, setUploadTokens] = useState<UploadToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkTemporary, setLinkTemporary] = useState(true);
  const [linkExpiresDays, setLinkExpiresDays] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matchLabel, setMatchLabel] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setCardError(null);
    try {
      const [pRes, lRes, uRes] = await Promise.all([
        api.get<PressPhoto[]>(`/tenants/${tenantId}/press/photos`),
        api.get<GalleryLink[]>(`/tenants/${tenantId}/press/gallery-links`),
        api.get<UploadToken[]>(`/tenants/${tenantId}/press/upload-tokens`),
      ]);
      setPhotos(Array.isArray(pRes.data) ? pRes.data : []);
      setLinks(Array.isArray(lRes.data) ? lRes.data : []);
      setUploadTokens(Array.isArray(uRes.data) ? uRes.data : []);
    } catch (e) {
      setPhotos([]);
      setLinks([]);
      setUploadTokens([]);
      setCardError(e instanceof Error ? e.message : "Erro ao carregar acervo.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

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
      if (matchLabel.trim()) form.append("matchLabel", matchLabel.trim());
      await api.postForm<PressPhoto>(`/tenants/${tenantId}/press/photos`, form);
      await load();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando fotos e links…
      </div>
    );
  }

  const inner = (
    <>
      {cardError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {cardError}
        </div>
      ) : null}

      <AssessoriaCollapsible title="Upload pelo dashboard" description="Envie fotos oficiais com rótulo do jogo">
        <Input
          placeholder="Jogo / partida (opcional) — ex.: Villa Nova x América — 15/03/2025"
          value={matchLabel}
          onChange={(e) => setMatchLabel(e.target.value)}
          className="mb-2"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleDashboardUpload(f);
          }}
        />
        <Button type="button" variant="secondary" size="sm" className="gap-2" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Enviando…" : "Enviar foto do jogo"}
        </Button>

        {photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.slice(0, 8).map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getPublicImageUrl(p.url) || p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 transition group-hover:opacity-100"
                  onClick={async () => {
                    try {
                      await api.delete(`/tenants/${tenantId}/press/photos/${p.id}`);
                      setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                    } catch {
                      setCardError("Não foi possível remover a foto.");
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </AssessoriaCollapsible>

      <AssessoriaCollapsible title="Link para fotógrafos" description="Upload em lote pela página pública" badge={`${uploadTokens.length}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              try {
                const { data } = await api.post<UploadToken>(`/tenants/${tenantId}/press/upload-tokens`, {});
                setUploadTokens((prev) => [data, ...prev]);
              } catch (e) {
                setCardError(e instanceof Error ? e.message : "Erro ao gerar link.");
              }
            }}
          >
            <Link2 className="h-4 w-4" />
            Gerar link de upload
          </Button>
          {uploadTokens.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-xs">
              <code className="flex-1 truncate">{t.url}</code>
              <Button type="button" size="sm" variant="ghost" onClick={() => copyUrl(t.url, t.id)}>
                <Copy className="h-3.5 w-3.5" />
                {copiedId === t.id ? "Copiado" : "Copiar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  await api.delete(`/tenants/${tenantId}/press/upload-tokens/${t.id}`);
                  setUploadTokens((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                Revogar
              </Button>
            </div>
          ))}
      </AssessoriaCollapsible>

      <AssessoriaCollapsible title="Link para jornalistas" description="Galeria + download em lote" badge={`${links.length}`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={linkTemporary} onChange={(e) => setLinkTemporary(e.target.checked)} />
              Temporário
            </label>
            {linkTemporary ? (
              <Input
                type="number"
                min={1}
                max={90}
                className="h-8 w-20"
                value={linkExpiresDays}
                onChange={(e) => setLinkExpiresDays(Number(e.target.value) || 7)}
              />
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={creatingLink}
              onClick={async () => {
                setCreatingLink(true);
                try {
                  const { data } = await api.post<GalleryLink>(`/tenants/${tenantId}/press/gallery-links`, {
                    temporary: linkTemporary,
                    expiresInDays: linkExpiresDays,
                  });
                  setLinks((prev) => [data, ...prev]);
                } catch (e) {
                  setCardError(e instanceof Error ? e.message : "Erro ao gerar link.");
                } finally {
                  setCreatingLink(false);
                }
              }}
            >
              {creatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar link de galeria"}
            </Button>
          </div>
          {links.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-xs">
              <code className="flex-1 truncate">{l.url}</code>
              <span className="text-muted-foreground">{l.isPermanent ? "Permanente" : "Expira"}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => copyUrl(l.url, l.id)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  await api.delete(`/tenants/${tenantId}/press/gallery-links/${l.id}`);
                  setLinks((prev) => prev.filter((x) => x.id !== l.id));
                }}
              >
                Revogar
              </Button>
            </div>
          ))}
      </AssessoriaCollapsible>
    </>
  );

  if (embedded) return inner;

  return (
    <AssessoriaCollapsible
      title="Fotos de jogos e links"
      description="Upload, link para fotógrafos e galeria para jornalistas. Fotos novas entram também no módulo Galeria."
      icon={Images}
      badge={`${photos.length} foto(s)`}
      borderClassName="border-violet-500/20"
    >
      {inner}
    </AssessoriaCollapsible>
  );
}
