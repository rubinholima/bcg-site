"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Copy, Check, ImageOff, Pencil, Loader2, Trash2 } from "lucide-react";
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
import {
  MEDIA_PLACEHOLDER_SIZES,
  MEDIA_PLACEHOLDER_KEYS,
  type MediaItem,
  type MediaPlaceholderSizeKey,
} from "@/lib/media-placeholders";
import { humanizeUploadFilename, mediaAssetOriginLabel } from "@/lib/upload-filename";
import { useAuth } from "@/context/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const searchParams = useSearchParams();
  const folderParam = searchParams.get("folder");
  const slugParam = searchParams.get("slug");
  const initialFolder = (folderParam && MEDIA_PLACEHOLDER_KEYS.includes(folderParam as MediaPlaceholderSizeKey))
    ? (folderParam as MediaPlaceholderSizeKey)
    : null;
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSizeKey, setFilterSizeKey] = useState<string>(initialFolder ?? "media_all");
  const [galeriaSlug, setGaleriaSlug] = useState<string>(slugParam ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadSizeKey, setUploadSizeKey] = useState<MediaPlaceholderSizeKey>(initialFolder ?? "hero");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [dimensions, setDimensions] = useState<Record<string, { w: number; h: number }>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [tenants, setTenants] = useState<Array<{ id: string; name?: string }>>([]);
  const [logoScope, setLogoScope] = useState<string>("group");
  const [logoDisplayName, setLogoDisplayName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!canAccessModule("midia")) return;
    fetch("/api/tenants", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Array<{ id: string; name?: string; slug?: string }>) => setTenants(Array.isArray(list) ? list : []))
      .catch(() => setTenants([]));
  }, [canAccessModule]);

  useEffect(() => {
    if (slugParam?.trim()) setGaleriaSlug(slugParam.trim());
  }, [slugParam]);

  const fetchList = (filter: string, slug?: string) => {
    setLoading(true);
    setError(null);
    const useAll =
      filter === "logos" ||
      filter === "logos_external" ||
      filter === "media_all" ||
      filter === "all_with_logos";
    let qs: string;
    if (filter === "galeria_clubes" && slug?.trim()) {
      qs = `?sizeKey=galeria_clubes&slug=${encodeURIComponent(slug.trim())}`;
    } else if (useAll) {
      qs = "?all=1";
    } else {
      qs = `?sizeKey=${encodeURIComponent(filter)}`;
    }
    fetch(`/api/media${qs}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar mídia");
        return res.json();
      })
      .then((data: { items: MediaItem[] }) => {
        let list = data.items ?? [];
        if (filter === "logos") {
          list = list.filter((i) => i.folder === "logos");
        }
        if (filter === "logos_external") {
          list = list.filter((i) => i.key.startsWith("logos/external/"));
        }
        setItems(list);
        setDimensions({});
        setImgErrors({});
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!canAccessModule("midia")) return;
    fetchList(filterSizeKey, filterSizeKey === "galeria_clubes" ? galeriaSlug : undefined);
  }, [filterSizeKey, galeriaSlug, canAccessModule]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const startEditName = (item: MediaItem) => {
    setEditingKey(item.key);
    setEditingValue(item.displayName?.trim() ?? "");
  };

  const saveDisplayName = () => {
    if (editingKey == null) return;
    setSavingName(true);
    fetch("/api/media", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: editingKey, displayName: editingValue.trim() || null }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d?.error ?? "Erro")));
        return res.json();
      })
      .then(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.key === editingKey ? { ...i, displayName: editingValue.trim() || null } : i,
          ),
        );
        setEditingKey(null);
        setEditingValue("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao salvar nome"))
      .finally(() => setSavingName(false));
  };

  const cancelEditName = () => {
    setEditingKey(null);
    setEditingValue("");
  };

  const openDeleteConfirm = (item: MediaItem) => setConfirmDeleteItem(item);

  const closeDeleteConfirm = () => setConfirmDeleteItem(null);

  const executeDelete = async () => {
    const item = confirmDeleteItem;
    if (!item) return;
    closeDeleteConfirm();
    setDeletingKey(item.key);
    setError(null);
    try {
      const res = await fetch(`/api/media?key=${encodeURIComponent(item.key)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? "Falha ao apagar");
      }
      setItems((prev) => prev.filter((i) => i.key !== item.key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar");
    } finally {
      setDeletingKey(null);
    }
  };

  const displayNameOrFallback = (item: MediaItem) => {
    if (item.displayName?.trim()) return item.displayName.trim();
    if (item.folder === "logos" || item.key.startsWith("logos/")) {
      const parts = item.key.split("/");
      if (parts[1] === "group") return "Logo grupo";
      if (parts[1] === "tenants" && parts[2]) return `Logo ${parts[2]}`;
      return parts.slice(1, -1).join(" / ") || "Logo";
    }
    const last = item.key.split("/").pop() ?? "";
    return last.length > 24 ? `${last.slice(0, 20)}…` : last;
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    if (uploadSizeKey === "galeria_clubes" && !galeriaSlug.trim()) {
      setError("Para Galeria fotos clubes, informe o slug do clube (ex: americano-fc).");
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("sizeKey", uploadSizeKey);
    if (uploadSizeKey === "galeria_clubes" && galeriaSlug.trim()) formData.append("slug", galeriaSlug.trim());
    const nameToSend = uploadDisplayName.trim() || humanizeUploadFilename(uploadFile.name);
    if (nameToSend) formData.append("displayName", nameToSend);
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
        setUploadDisplayName("");
        fetchList(filterSizeKey, filterSizeKey === "galeria_clubes" ? galeriaSlug : undefined);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro no upload"))
      .finally(() => setUploading(false));
  };

  const handleUploadLogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile || !logoScope.trim()) return;
    setUploadingLogo(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", logoFile);
    formData.append("scope", logoScope.trim());
    const displayNameToSet =
      logoDisplayName.trim() || humanizeUploadFilename(logoFile.name);
    if (displayNameToSet) formData.append("displayName", displayNameToSet);
    fetch("/api/upload/logo", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d?.error ?? "Erro")));
        return res.json();
      })
      .then((data: { url?: string; key?: string }) => {
        if (data.key && displayNameToSet) {
          return fetch("/api/media", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: data.key, displayName: displayNameToSet }),
          }).then((r) => {
            if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d?.error ?? "Erro ao salvar nome")));
          });
        }
        return undefined;
      })
      .then(() => {
        setLogoFile(null);
        setLogoDisplayName("");
        if (
          filterSizeKey === "logos" ||
          filterSizeKey === "logos_external" ||
          filterSizeKey === "all_with_logos"
        )
          fetchList(filterSizeKey);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro no upload do logo"))
      .finally(() => setUploadingLogo(false));
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
            Escolha o tamanho do placeholder (pasta no S3). A imagem ficará disponível na listagem e poderá ser escolhida nos editores. Use a pasta <strong>Patrocinadores (logos)</strong> para logos de patrocinadores. Use a pasta <strong>Atletas (fotos)</strong> para fotos dos atletas. Use <strong>Imagens de apoio (atletas)</strong> para fotos adicionais do CRUD de atletas.
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
            {uploadSizeKey === "galeria_clubes" && (
              <div className="space-y-2">
                <Label>Clube (slug)</Label>
                <Select
                  value={galeriaSlug || "__none__"}
                  onValueChange={(v) => setGaleriaSlug(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o clube" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione o clube</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={(t as { slug?: string }).slug ?? t.id}>
                        {t.name?.trim() || (t as { slug?: string }).slug || t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome da imagem</Label>
              <Input
                placeholder="Preenchido pelo nome do arquivo se vazio"
                value={uploadDisplayName}
                onChange={(e) => setUploadDisplayName(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (!f) return;
                  const base = humanizeUploadFilename(f.name);
                  if (!base) return;
                  setUploadDisplayName((prev) => {
                    if (prev.trim()) return prev;
                    if (uploadSizeKey === "galeria_clubes" && galeriaSlug.trim()) {
                      const t = tenants.find(
                        (x) => ((x as { slug?: string }).slug ?? x.id) === galeriaSlug.trim(),
                      );
                      const club = t?.name?.trim() || galeriaSlug.trim();
                      return `${club} — ${base}`;
                    }
                    return base;
                  });
                }}
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
          <CardTitle>Enviar logo (empresa/clube)</CardTitle>
          <CardDescription>
            Logos ficam na pasta <strong>logos/</strong> do bucket (logos/group/, logos/tenants/ID/ ou logos/external/ para Clubes Adv). Escolha o escopo e envie a imagem. Depois use o filtro &quot;Logos (empresas/clubes)&quot; para ver e editar o nome.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadLogo} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select value={logoScope} onValueChange={setLogoScope}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Grupo (BCG)</SelectItem>
                  <SelectItem value="external">Clubes Adv</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name?.trim() || t.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Preenchido pelo nome do arquivo se vazio"
                value={logoDisplayName}
                onChange={(e) => setLogoDisplayName(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setLogoFile(f);
                  if (!f) return;
                  const base = humanizeUploadFilename(f.name);
                  if (!base) return;
                  setLogoDisplayName((prev) => (prev.trim() ? prev : base));
                }}
              />
            </div>
            <Button type="submit" disabled={!logoFile || uploadingLogo}>
              <Upload className="h-4 w-4 mr-2" />
              {uploadingLogo ? "Enviando…" : "Enviar logo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagens no S3</CardTitle>
          <CardDescription>
            Bucket bcg-platform-assets: pasta <strong>media/</strong> (hero, cards, etc.) e pasta <strong>logos/</strong> (empresas/clubes e Clubes Adv em <code className="text-xs">logos/external/</code>). A coluna <strong>Origem</strong> indica a categoria. Clique no nome para editar.
          </CardDescription>
          <div className="pt-2 space-y-2">
            <Label className="text-muted-foreground">Filtrar por tamanho</Label>
            <div className="flex flex-wrap items-end gap-2">
              <Select value={filterSizeKey} onValueChange={setFilterSizeKey}>
                <SelectTrigger className="w-[280px] mt-1">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="media_all">Todas as pastas (mídia + logos)</SelectItem>
                  <SelectItem value="logos">Logos (empresas/clubes)</SelectItem>
                  <SelectItem value="logos_external">Logos Clubes Adv</SelectItem>
                  <SelectItem value="all_with_logos">Tudo (mídia + logos)</SelectItem>
                  {MEDIA_PLACEHOLDER_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {MEDIA_PLACEHOLDER_SIZES[key].label} — {MEDIA_PLACEHOLDER_SIZES[key].dimensions}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterSizeKey === "galeria_clubes" && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Clube (slug)</Label>
                  <Select
                    value={galeriaSlug || "__none__"}
                    onValueChange={(v) => setGaleriaSlug(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione o clube" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione o clube</SelectItem>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={(t as { slug?: string }).slug ?? t.id}>
                          {t.name?.trim() || (t as { slug?: string }).slug || t.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : filterSizeKey === "galeria_clubes" && !galeriaSlug.trim() ? (
            <p className="text-muted-foreground">
              Selecione o clube (slug) acima para listar as fotos da galeria.
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">
              {filterSizeKey === "logos" || filterSizeKey === "logos_external"
                ? filterSizeKey === "logos_external"
                  ? "Nenhum logo em Clubes Adv. Envie com escopo “Clubes Adv” acima."
                  : "Nenhum logo. Use o formulário “Enviar logo (empresa/clube)” acima."
                : filterSizeKey === "galeria_clubes"
                  ? "Nenhuma foto deste clube. Use o formulário acima e selecione o clube para enviar."
                  : "Nenhuma imagem nesta pasta. Envie uma acima."}
            </p>
          ) : (
            <div className="rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium w-16">Foto</th>
                    <th className="text-left py-2 px-3 font-medium w-[140px]">Origem</th>
                    <th className="text-left py-2 px-3 font-medium">Nome</th>
                    <th className="text-left py-2 px-3 font-medium w-20">KB</th>
                    <th className="text-left py-2 px-3 font-medium w-28">Pixels</th>
                    <th className="text-left py-2 px-3 font-medium min-w-0">URL</th>
                    <th className="w-24 py-2 px-1 text-center">Ações</th>
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
                      <td className="py-1.5 px-3 align-middle text-xs text-muted-foreground whitespace-nowrap">
                        {mediaAssetOriginLabel(item.key)}
                      </td>
                      <td className="py-1.5 px-3 max-w-[220px]">
                        {editingKey === item.key ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              placeholder="Nome da imagem"
                              className="h-8 text-sm max-w-[160px]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveDisplayName();
                                if (e.key === "Escape") cancelEditName();
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8"
                              disabled={savingName}
                              onClick={saveDisplayName}
                            >
                              {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={cancelEditName}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span
                              className="truncate text-muted-foreground cursor-pointer hover:text-foreground"
                              title={item.key}
                              onClick={() => startEditName(item)}
                            >
                              {displayNameOrFallback(item)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => startEditName(item)}
                              title="Editar nome"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
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
                        <div className="flex items-center justify-center gap-0.5">
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDeleteConfirm(item)}
                            disabled={deletingKey === item.key}
                            title="Apagar imagem"
                          >
                            {deletingKey === item.key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDeleteItem} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar imagem?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteItem && (
                <>
                  Apagar &quot;{displayNameOrFallback(confirmDeleteItem)}&quot;?
                  <br />
                  <br />
                  Esta ação não pode ser desfeita. A imagem será removida do S3.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void executeDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
