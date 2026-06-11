"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BostonTvEnabledChannelSelect,
  formatIptvChannelLabel,
  type IptvChannelOption,
} from "@/components/boston-tv/BostonTvEnabledChannelSelect";
import { BostonTvCollapsibleSection } from "@/components/boston-tv/BostonTvCollapsibleSection";
import { setStoredBostonTvTenantId } from "@/lib/boston-tv-tenant-storage";

type Item = {
  id: string;
  contentType: string;
  url: string;
  durationSeconds: number | null;
  sortOrder: number;
};

type Playlist = {
  id: string;
  name: string;
  tenantId: string;
  items: Item[];
};

const TYPE_LABEL: Record<string, string> = {
  image_url: "Imagem (URL)",
  video_url: "Vídeo (arquivo URL)",
  youtube_video: "YouTube (URL do vídeo)",
  iptv_stream: "Canal IPTV (ao vivo)",
};

function extractYoutubeId(url: string): string | null {
  const v = /[?&]v=([^&]+)/.exec(url);
  if (v?.[1]) return v[1];
  const be = /youtu\.be\/([^?]+)/.exec(url);
  if (be?.[1]) return be[1];
  return null;
}

function formatItemContent(item: Item, iptvByStream: Map<string, string>): string {
  if (item.contentType === "iptv_stream") {
    return iptvByStream.get(item.url) ?? "Canal IPTV ao vivo";
  }
  if (item.contentType === "youtube_video") {
    const yid = extractYoutubeId(item.url);
    return yid ? `YouTube — ${yid}` : "YouTube";
  }
  if (item.contentType === "image_url" || item.contentType === "video_url") {
    try {
      const name = decodeURIComponent(new URL(item.url).pathname.split("/").pop() || "");
      if (name) {
        return item.contentType === "image_url" ? `Imagem — ${name}` : `Vídeo — ${name}`;
      }
    } catch {
      /* ignore */
    }
    return item.contentType === "image_url" ? "Imagem" : "Vídeo MP4";
  }
  return item.url;
}

export default function EditBostonTvPlaylistPage() {
  const params = useParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const id = params.id as string;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [ty, setTy] = useState<string>("image_url");
  const [urlIn, setUrlIn] = useState("");
  const [durIn, setDurIn] = useState("15");
  const [iptvChannelId, setIptvChannelId] = useState("");
  const [iptvByStream, setIptvByStream] = useState<Map<string, string>>(new Map());
  const [addOpen, setAddOpen] = useState(true);
  const [itemsOpen, setItemsOpen] = useState(true);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState(false);

  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editTy, setEditTy] = useState("image_url");
  const [editUrlIn, setEditUrlIn] = useState("");
  const [editDurIn, setEditDurIn] = useState("15");
  const [editIptvChannelId, setEditIptvChannelId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadIptvLabels = useCallback(async (tenantId: string) => {
    try {
      const { data } = await api.get<{
        items: (IptvChannelOption & { streamUrl: string })[];
      }>(
        `/boston-tv/iptv/channels?tenantId=${encodeURIComponent(tenantId)}&enabledOnly=1&limit=500`,
      );
      const map = new Map<string, string>();
      for (const ch of data?.items ?? []) {
        if (ch.streamUrl) map.set(ch.streamUrl, formatIptvChannelLabel(ch));
      }
      setIptvByStream(map);
    } catch {
      setIptvByStream(new Map());
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Playlist>(`/boston-tv/playlists/${id}`);
      setPlaylist(data ?? null);
      setErr(null);
    } catch (e) {
      setPlaylist(null);
      setErr(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (playlist?.tenantId) void loadIptvLabels(playlist.tenantId);
  }, [playlist?.tenantId, loadIptvLabels]);

  useEffect(() => {
    if (playlist?.tenantId) setStoredBostonTvTenantId(playlist.tenantId);
  }, [playlist?.tenantId]);

  const addItem = async () => {
    if (!playlist) return;
    let url = urlIn.trim();
    let durationSeconds: number | undefined;

    if (ty === "iptv_stream") {
      if (!iptvChannelId) return;
      const { data: list } = await api.get<{ items: { id: string; streamUrl: string }[] }>(
        `/boston-tv/iptv/channels?tenantId=${encodeURIComponent(playlist.tenantId)}&enabledOnly=1&limit=200`,
      );
      const found = list?.items?.find((c) => c.id === iptvChannelId);
      if (!found) {
        alert("Canal não encontrado ou não liberado.");
        return;
      }
      url = found.streamUrl;
      durationSeconds = Math.max(60, parseInt(durIn, 10) || 3600);
    } else {
      if (!url) return;
      if (ty === "image_url") {
        durationSeconds = Math.max(5, parseInt(durIn, 10) || 15);
      } else if (ty === "youtube_video" && durIn.trim()) {
        durationSeconds = Math.max(30, parseInt(durIn, 10) || 480);
      }
    }

    await api.post(`/boston-tv/playlists/${id}/items`, {
      contentType: ty,
      url,
      durationSeconds,
    });
    setUrlIn("");
    setIptvChannelId("");
    await load();
  };

  const removeItem = async () => {
    if (!removeItemId) return;
    setRemovingItem(true);
    try {
      await api.delete(`/boston-tv/playlists/${id}/items/${removeItemId}`);
      setRemoveItemId(null);
      await load();
    } finally {
      setRemovingItem(false);
    }
  };

  const openEditItem = async (item: Item) => {
    setEditItem(item);
    setEditTy(item.contentType);
    setEditDurIn(String(item.durationSeconds ?? (item.contentType === "image_url" ? 15 : 3600)));
    setEditUrlIn(item.contentType === "iptv_stream" ? "" : item.url);
    setEditIptvChannelId("");

    if (item.contentType === "iptv_stream" && playlist?.tenantId) {
      try {
        const { data: list } = await api.get<{ items: { id: string; streamUrl: string }[] }>(
          `/boston-tv/iptv/channels?tenantId=${encodeURIComponent(playlist.tenantId)}&enabledOnly=1&limit=500`,
        );
        const found = list?.items?.find((c) => c.streamUrl === item.url);
        if (found) setEditIptvChannelId(found.id);
      } catch {
        /* ignore */
      }
    }
  };

  const saveEditItem = async () => {
    if (!editItem || !playlist) return;
    setSavingEdit(true);
    try {
      let url = editUrlIn.trim();
      let durationSeconds: number | null | undefined;

      if (editTy === "iptv_stream") {
        if (!editIptvChannelId) return;
        const { data: list } = await api.get<{ items: { id: string; streamUrl: string }[] }>(
          `/boston-tv/iptv/channels?tenantId=${encodeURIComponent(playlist.tenantId)}&enabledOnly=1&limit=200`,
        );
        const found = list?.items?.find((c) => c.id === editIptvChannelId);
        if (!found) {
          alert("Canal não encontrado ou não liberado.");
          return;
        }
        url = found.streamUrl;
        durationSeconds = Math.max(60, parseInt(editDurIn, 10) || 3600);
      } else {
        if (!url) return;
        if (editTy === "image_url") {
          durationSeconds = Math.max(5, parseInt(editDurIn, 10) || 15);
        } else if (editTy === "youtube_video") {
          durationSeconds = editDurIn.trim()
            ? Math.max(30, parseInt(editDurIn, 10) || 480)
            : null;
        } else {
          durationSeconds = null;
        }
      }

      await api.patch(`/boston-tv/playlists/${id}/items/${editItem.id}`, {
        contentType: editTy,
        url,
        durationSeconds,
      });
      setEditItem(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  };

  if (!canAccessModule("boston_tv") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo Boston TV.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (loading && !playlist) {
    return (
      <div className="py-8 text-muted-foreground text-sm">Carregando playlist…</div>
    );
  }

  if (err || !playlist) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">{err ?? "Playlist não encontrada"}</p>
        <Link href="/dashboard/marketing/boston-tv">
          <Button variant="outline" size="sm">
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const items = playlist.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/marketing/boston-tv">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{playlist.name}</h1>
        </div>
      </div>

      <BostonTvCollapsibleSection
        title="Adicionar item"
        open={addOpen}
        onOpenChange={setAddOpen}
      >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label>Tipo</Label>
            <Select value={ty} onValueChange={(v) => { setTy(v); if (v === "iptv_stream") setDurIn("3600"); if (v === "image_url") setDurIn("15"); }}>
              <SelectTrigger className="text-foreground">
                <SelectValue placeholder="Tipo de conteúdo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image_url">{TYPE_LABEL.image_url}</SelectItem>
                <SelectItem value="video_url">{TYPE_LABEL.video_url}</SelectItem>
                <SelectItem value="youtube_video">{TYPE_LABEL.youtube_video}</SelectItem>
                <SelectItem value="iptv_stream">{TYPE_LABEL.iptv_stream}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {ty === "image_url" || ty === "youtube_video" || ty === "iptv_stream" ? (
            <div className="space-y-2 w-40">
              <Label>
                {ty === "image_url"
                  ? "Segundos na tela"
                  : ty === "iptv_stream"
                    ? "Segundos no ar"
                    : "Tempo até próximo (s)"}
              </Label>
              <Input
                type="number"
                min={ty === "image_url" ? 5 : ty === "iptv_stream" ? 60 : 30}
                value={durIn}
                onChange={(e) => setDurIn(e.target.value)}
                className="text-foreground"
              />
            </div>
          ) : null}
          {ty === "iptv_stream" ? (
            <div className="w-full sm:flex-1 min-w-[240px]">
              <BostonTvEnabledChannelSelect
                tenantId={playlist.tenantId}
                value={iptvChannelId}
                onChange={setIptvChannelId}
              />
            </div>
          ) : ty !== "iptv_stream" ? (
          <div className="space-y-2 flex-1 min-w-[240px]">
            <Label>URL</Label>
            <Input
              value={urlIn}
              onChange={(e) => setUrlIn(e.target.value)}
              placeholder={
                ty === "youtube_video"
                  ? "https://www.youtube.com/watch?v=..."
                  : ty === "video_url"
                    ? "https://.../video.mp4"
                    : "https://.../imagem.jpg"
              }
              className="text-foreground"
            />
          </div>
          ) : null}
          <Button type="button" onClick={() => void addItem()} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Incluir
          </Button>
          </div>
      </BostonTvCollapsibleSection>

      <BostonTvCollapsibleSection
        title={`Itens (${items.length})`}
        open={itemsOpen}
        onOpenChange={setItemsOpen}
      >
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{TYPE_LABEL[it.contentType] ?? it.contentType}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-sm text-foreground">
                      {formatItemContent(it, iptvByStream)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {it.durationSeconds != null ? `${it.durationSeconds}s` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void openEditItem(it)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemoveItemId(it.id)}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </BostonTvCollapsibleSection>

      <AlertDialog open={!!removeItemId} onOpenChange={(open) => !open && setRemoveItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item sai da playlist. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingItem}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removingItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void removeItem()}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar item da playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editTy}
                onValueChange={(v) => {
                  setEditTy(v);
                  if (v === "iptv_stream") setEditDurIn("3600");
                  if (v === "image_url") setEditDurIn("15");
                }}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Tipo de conteúdo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image_url">{TYPE_LABEL.image_url}</SelectItem>
                  <SelectItem value="video_url">{TYPE_LABEL.video_url}</SelectItem>
                  <SelectItem value="youtube_video">{TYPE_LABEL.youtube_video}</SelectItem>
                  <SelectItem value="iptv_stream">{TYPE_LABEL.iptv_stream}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editTy === "image_url" || editTy === "youtube_video" || editTy === "iptv_stream" ? (
              <div className="space-y-2">
                <Label>
                  {editTy === "image_url"
                    ? "Segundos na tela"
                    : editTy === "iptv_stream"
                      ? "Segundos no ar"
                      : "Tempo até próximo (s)"}
                </Label>
                <Input
                  type="number"
                  min={editTy === "image_url" ? 5 : editTy === "iptv_stream" ? 60 : 30}
                  value={editDurIn}
                  onChange={(e) => setEditDurIn(e.target.value)}
                  className="text-foreground"
                />
              </div>
            ) : null}
            {editTy === "iptv_stream" ? (
              <BostonTvEnabledChannelSelect
                tenantId={playlist.tenantId}
                value={editIptvChannelId}
                onChange={setEditIptvChannelId}
              />
            ) : (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={editUrlIn}
                  onChange={(e) => setEditUrlIn(e.target.value)}
                  className="text-foreground"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEditItem()} disabled={savingEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
