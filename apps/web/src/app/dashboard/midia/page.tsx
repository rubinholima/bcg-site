"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Copy, Check, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  MEDIA_PLACEHOLDER_SIZES,
  MEDIA_PLACEHOLDER_KEYS,
  type MediaItem,
  type MediaPlaceholderSizeKey,
} from "@/lib/media-placeholders";
import { useAuth } from "@/context/AuthContext";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number((bytes / Math.pow(k, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
}

function thumbSrc(key: string): string {
  return `/api/media/thumbnail?key=${encodeURIComponent(key)}`;
}

export default function MidiaPage() {
  const { canAccessModule } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSizeKey, setFilterSizeKey] = useState<string>("media_all");
  const [uploading, setUploading] = useState(false);
  const [uploadSizeKey, setUploadSizeKey] = useState<MediaPlaceholderSizeKey>("hero");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, { w: number; h: number }>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const fetchList = (filter: string) => {
    setLoading(true);
    setError(null);
    const sizeKey = filter === "media_all" ? undefined : (filter || undefined);
    const qs = sizeKey ? `?sizeKey=${encodeURIComponent(sizeKey)}` : "";
    fetch(`/api/media${qs}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar mídia");
        return res.json();
      })
      .then((data: { items: MediaItem[] }) => {
        setItems(data.items ?? []);
        setDimensions({});
        setImgErrors({});
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!canAccessModule("midia")) return;
    fetchList(filterSizeKey);
  }, [filterSizeKey, canAccessModule]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("sizeKey", uploadSizeKey);
    fetch("/api/media", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) return res.text().then((t) => Promise.reject(new Error(t)));
        return res.json();
      })
      .then(() => {
        setUploadFile(null);
        fetchList(filterSizeKey);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro no upload"))
      .finally(() => setUploading(false));
  };

  if (!canAccessModule("midia")) {
    return (
      <div className="p-6">
        <p className="text-destructive">Você não tem acesso ao módulo Mídia.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Mídia</h1>
          <p className="text-sm text-muted-foreground">
            Todas as imagens do site ficam no bucket <strong>bcg-platform-assets</strong> (pasta media/). Fotos, tamanho e URL. Copie a URL para usar em Conteúdo ou Páginas.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Enviar imagem</CardTitle>
          <CardDescription>
            Escolha o tamanho do placeholder (pasta no S3). A imagem ficará disponível na listagem e poderá ser escolhida nos editores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Tamanho do placeholder</Label>
              <Select
                value={uploadSizeKey}
                onValueChange={(v) => setUploadSizeKey(v as MediaPlaceholderSizeKey)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_PLACEHOLDER_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {MEDIA_PLACEHOLDER_SIZES[key].label} — {MEDIA_PLACEHOLDER_SIZES[key].dimensions}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={!uploadFile || uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Enviando…" : "Enviar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagens no S3</CardTitle>
          <CardDescription>
            Bucket bcg-platform-assets, pasta media/. Lista: miniatura, nome, tamanho (KB), tamanho em pixels e URL.
          </CardDescription>
          <div className="pt-2">
            <Label className="text-muted-foreground">Filtrar por tamanho</Label>
            <Select value={filterSizeKey} onValueChange={setFilterSizeKey}>
              <SelectTrigger className="w-[280px] mt-1">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="media_all">Todas as pastas</SelectItem>
                {MEDIA_PLACEHOLDER_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {MEDIA_PLACEHOLDER_SIZES[key].label} — {MEDIA_PLACEHOLDER_SIZES[key].dimensions}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhuma imagem nesta pasta. Envie uma acima.
            </p>
          ) : (
            <div className="rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium w-16">Foto</th>
                    <th className="text-left py-2 px-3 font-medium">Nome</th>
                    <th className="text-left py-2 px-3 font-medium w-20">KB</th>
                    <th className="text-left py-2 px-3 font-medium w-28">Pixels</th>
                    <th className="text-left py-2 px-3 font-medium min-w-0">URL</th>
                    <th className="w-10 py-2 px-1" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-1.5 px-3 align-middle">
                        <div className="h-14 w-20 rounded border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {imgErrors[item.key] ? (
                            <ImageOff className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <img
                              src={thumbSrc(item.key)}
                              alt=""
                              className="h-full w-full object-cover"
                              onLoad={(e) => {
                                const el = e.currentTarget;
                                setDimensions((prev) => ({
                                  ...prev,
                                  [item.key]: { w: el.naturalWidth, h: el.naturalHeight },
                                }));
                              }}
                              onError={() => setImgErrors((prev) => ({ ...prev, [item.key]: true }))}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 font-mono text-muted-foreground truncate max-w-[180px]" title={item.key}>
                        {item.key.split("/").pop()}
                      </td>
                      <td className="py-1.5 px-3 text-muted-foreground">
                        {formatBytes(item.size)}
                      </td>
                      <td className="py-1.5 px-3 text-muted-foreground tabular-nums">
                        {dimensions[item.key]
                          ? `${dimensions[item.key].w} × ${dimensions[item.key].h}`
                          : "—"}
                      </td>
                      <td className="py-1.5 px-3 min-w-0">
                        <input
                          type="text"
                          readOnly
                          value={item.url}
                          className="w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-xs font-mono truncate"
                        />
                      </td>
                      <td className="py-1.5 px-1 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleCopyUrl(item.url)}
                          title="Copiar URL"
                        >
                          {copiedUrl === item.url ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
