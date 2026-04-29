"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
};

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

  const addItem = async () => {
    if (!urlIn.trim()) return;
    let durationSeconds: number | undefined;
    if (ty === "image_url") {
      durationSeconds = Math.max(5, parseInt(durIn, 10) || 15);
    } else if (ty === "youtube_video" && durIn.trim()) {
      durationSeconds = Math.max(30, parseInt(durIn, 10) || 480);
    }
    await api.post(`/boston-tv/playlists/${id}/items`, {
      contentType: ty,
      url: urlIn.trim(),
      durationSeconds,
    });
    setUrlIn("");
    await load();
  };

  const removeItem = async (itemId: string) => {
    if (!confirm("Remover este item?")) return;
    await api.delete(`/boston-tv/playlists/${id}/items/${itemId}`);
    await load();
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
          <p className="text-sm text-muted-foreground">
            Itens são exibidos em ordem, em loop na tela associada.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar item</CardTitle>
          <CardDescription>
            Imagem precisa de duração (segundos). YouTube cole o link do vídeo (não só da playlist). Opcionalmente
            defina &quot;duração&quot; no backend no futuro; por enquanto o player avança o YouTube em ~8 min se
            não informar tempo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label>Tipo</Label>
            <Select value={ty} onValueChange={setTy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image_url">{TYPE_LABEL.image_url}</SelectItem>
                <SelectItem value="video_url">{TYPE_LABEL.video_url}</SelectItem>
                <SelectItem value="youtube_video">{TYPE_LABEL.youtube_video}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {ty === "image_url" || ty === "youtube_video" ? (
            <div className="space-y-2 w-36">
              <Label>
                {ty === "image_url" ? "Segundos na tela" : "Tempo até próximo (s)"}
              </Label>
              <Input
                type="number"
                min={ty === "image_url" ? 5 : 30}
                value={durIn}
                onChange={(e) => setDurIn(e.target.value)}
                className="text-foreground"
              />
              {ty === "youtube_video" ? (
                <p className="text-xs text-muted-foreground">
                  Opcional; padrão 480 s se vazio no envio inicial.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2 flex-1 min-w-[240px]">
            <Label>URL</Label>
            <Input
              value={urlIn}
              onChange={(e) => setUrlIn(e.target.value)}
              placeholder="https://..."
              className="text-foreground"
            />
          </div>
          <Button type="button" onClick={() => void addItem()}>
            <Plus className="mr-2 h-4 w-4" />
            Incluir
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{TYPE_LABEL[it.contentType] ?? it.contentType}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground">
                      {it.url}
                    </TableCell>
                    <TableCell className="text-sm">
                      {it.durationSeconds != null ? `${it.durationSeconds}s` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeItem(it.id)}
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
