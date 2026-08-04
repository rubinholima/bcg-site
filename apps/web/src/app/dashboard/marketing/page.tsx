"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Megaphone,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  getPublicImageUrl,
  resolveMediaUrlWithProxyFallback,
  resolvePublicMediaUrlForDisplay,
} from "@/lib/media-url";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import {
  DashboardDeptHeader,
  DashboardDeptToolbarAside,
} from "@/components/dashboard/DashboardDeptHeader";

function plannerMediaThumbSrc(raw: string): string {
  return (
    resolvePublicMediaUrlForDisplay(raw) ||
    resolveMediaUrlWithProxyFallback(raw) ||
    getPublicImageUrl(raw) ||
    raw
  );
}

interface Tenant {
  id: string;
  name: string;
  slug?: string;
}

interface MarketingPost {
  id: string;
  tenantId: string | null;
  tenant?: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  title: string | null;
  content: string;
  imageUrls: string[] | null;
  platforms: string[] | null;
  scheduledAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const SELECT_NATIVE_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  published: "Publicada",
  failed: "Falhou",
  cancelled: "Cancelada",
};

const PLATFORM_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: { date: string; day: number; isCurrent: boolean; isEmpty: boolean }[] = [];

  for (let i = 0; i < startPad; i++) {
    days.push({ date: "", day: 0, isCurrent: false, isEmpty: true });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isCurrent: true, isEmpty: false });
  }
  return days;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const date = formatDateDayMonYear(d);
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  } catch {
    return iso;
  }
}

export default function MarketingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tenantParam = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading, isSuperAdmin } = useAuth();

  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [metaStatus, setMetaStatus] = useState<{ connected: boolean; expiresAt: string | null } | null>(null);
  const [publishingFb, setPublishingFb] = useState(false);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [formEdit, setFormEdit] = useState<MarketingPost | null>(null);
  const [formData, setFormData] = useState({
    tenantId: "" as string | null,
    title: "",
    content: "",
    imageUrls: [] as string[],
    platforms: ["facebook", "instagram"] as string[],
    scheduledAt: "",
    status: "draft",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mediaRefresh, setMediaRefresh] = useState(0);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("month", String(month + 1));
    if (tenantParam) params.set("tenantId", tenantParam);
    api
      .get<MarketingPost[]>(`/marketing/posts?${params.toString()}`)
      .then(({ data }) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [year, month, tenantParam]);

  const metaQueryFlag = searchParams.get("meta");

  useEffect(() => {
    if (!canAccessModule("marketing") || authLoading) return;
    api
      .get<{ connected: boolean; expiresAt: string | null }>("/integration/meta/status")
      .then(({ data }) => setMetaStatus(data))
      .catch(() => setMetaStatus({ connected: false, expiresAt: null }));
  }, [canAccessModule, authLoading, metaQueryFlag]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    if (!canAccessModule("marketing") && !authLoading) return;
    fetchPosts();
  }, [canAccessModule, authLoading, fetchPosts]);

  const postsByDate = posts.reduce<Record<string, MarketingPost[]>>((acc, p) => {
    if (!p.scheduledAt) return acc;
    const dateStr = p.scheduledAt.slice(0, 10);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(p);
    return acc;
  }, {});

  const drafts = posts.filter((p) => p.status === "draft" && !p.scheduledAt);
  const days = getDaysInMonth(year, month);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const openNewPost = (date?: string) => {
    const d = new Date(year, month, date ? parseInt(date.slice(8, 10), 10) : new Date().getDate());
    setFormEdit(null);
    setFormData({
      tenantId: tenantParam === "group" ? null : tenantParam || null,
      title: "",
      content: "",
      imageUrls: [],
      platforms: ["facebook", "instagram"],
      scheduledAt: date ? `${date}T09:00:00` : "",
      status: "draft",
      notes: "",
    });
    setFormOpen(true);
  };

  const openEditPost = (p: MarketingPost) => {
    setFormEdit(p);
    setFormData({
      tenantId: p.tenantId || null,
      title: p.title || "",
      content: p.content,
      imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
      platforms: Array.isArray(p.platforms) ? p.platforms : ["facebook", "instagram"],
      scheduledAt: p.scheduledAt ? p.scheduledAt.slice(0, 16) : "",
      status: p.status,
      notes: p.notes || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (formEdit) {
        await api.patch(`/marketing/posts/${formEdit.id}`, {
          tenantId: formData.tenantId || null,
          title: formData.title || null,
          content: formData.content,
          imageUrls: formData.imageUrls,
          platforms: formData.platforms,
          scheduledAt: formData.scheduledAt || null,
          status: formData.status,
          notes: formData.notes || null,
        });
      } else {
        await api.post("/marketing/posts", {
          tenantId: formData.tenantId || null,
          title: formData.title || null,
          content: formData.content,
          imageUrls: formData.imageUrls,
          platforms: formData.platforms,
          scheduledAt: formData.scheduledAt || null,
          status: formData.status,
          notes: formData.notes || null,
        });
      }
      setFormOpen(false);
      fetchPosts();
    } catch (e) {
      alert((e as Error).message || "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta postagem?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/marketing/posts/${id}`);
      setFormOpen(false);
      fetchPosts();
    } catch {
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublishFacebook = async () => {
    if (!formEdit?.id) return;
    setPublishingFb(true);
    try {
      await api.post(`/marketing/posts/${formEdit.id}/publish-facebook`);
      setFormOpen(false);
      fetchPosts();
      alert("Publicado no Facebook.");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Falha ao publicar no Facebook.");
    } finally {
      setPublishingFb(false);
    }
  };

  const addImage = (url: string) => {
    if (url && !formData.imageUrls.includes(url)) {
      setFormData((d) => ({ ...d, imageUrls: [...d.imageUrls, url] }));
    }
  };

  const removeImage = (idx: number) => {
    setFormData((d) => ({
      ...d,
      imageUrls: d.imageUrls.filter((_, i) => i !== idx),
    }));
  };

  const togglePlatform = (platform: string) => {
    setFormData((d) => {
      const arr = d.platforms.includes(platform)
        ? d.platforms.filter((x) => x !== platform)
        : [...d.platforms, platform];
      return { ...d, platforms: arr.length ? arr : ["facebook"] };
    });
  };

  if (!canAccessModule("marketing") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo Marketing.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <DashboardDeptHeader
        section="Marketing"
        sectionIcon={Megaphone}
        title="Planner de conteúdo"
        description="Calendário de postagens inspirado no Meta Business Suite — planeje e agende para Facebook, Instagram e LinkedIn."
        stats={[
          { value: posts.length, label: "Postagens" },
          { value: tenants.length, label: "Empresas" },
        ]}
        toolbar={
          <>
            <div className="flex-1" />
            <DashboardDeptToolbarAside>
              <select
              className={SELECT_NATIVE_CLASS + " w-[min(220px,calc(100vw-120px))] min-h-[44px] shrink-0"}
              aria-label="Filtrar por empresa"
              value={tenantParam ? tenantParam : "all"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "all") router.replace(pathname);
                else router.replace(`${pathname}?tenantId=${encodeURIComponent(v)}`);
              }}
            >
              <option value="all">Todos</option>
              <option value="group">Grupo (BCG)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button className="min-h-[44px]" onClick={() => openNewPost()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova postagem
            </Button>
            </DashboardDeptToolbarAside>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold min-w-[180px] text-center">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 text-sm">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center py-2 text-muted-foreground font-medium">
                    {w}
                  </div>
                ))}
                {days.map((cell, i) =>
                  cell.isEmpty ? (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ) : (
                    <div
                      key={cell.date}
                      className="aspect-square border rounded-lg p-1 flex flex-col hover:bg-muted/50 cursor-pointer min-h-[80px] sm:min-h-[100px]"
                      onClick={() => openNewPost(cell.date)}
                    >
                      <span className="text-muted-foreground text-xs">{cell.day}</span>
                      <div className="flex-1 flex flex-wrap gap-0.5 overflow-hidden">
                        {(postsByDate[cell.date] ?? []).slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            className="text-xs truncate px-1 py-0.5 rounded bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditPost(p);
                            }}
                          >
                            {p.title || (p.content || "").slice(0, 15) + ((p.content?.length ?? 0) > 15 ? "…" : "")}
                          </div>
                        ))}
                        {(postsByDate[cell.date]?.length ?? 0) > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{(postsByDate[cell.date]?.length ?? 0) - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista lateral */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agendadas
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {posts
                  .filter((p) => p.scheduledAt && p.status !== "draft")
                  .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-muted"
                      onClick={() => openEditPost(p)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.title || "Sem título"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(p.scheduledAt)}</p>
                        {p.tenant?.name && (
                          <p className="text-xs text-muted-foreground truncate">{p.tenant.name}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditPost(p); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                {posts.filter((p) => p.scheduledAt && p.status !== "draft").length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Nenhuma postagem agendada neste mês.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-amber-600 dark:text-amber-500">Integração Meta</h3>
              <p className="text-sm">
                {metaStatus?.connected ? (
                  <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                    Conectado
                    {metaStatus.expiresAt
                      ? ` — token válido até ${formatDateTime(metaStatus.expiresAt)}`
                      : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Não conectado</span>
                )}
              </p>
              {searchParams.get("meta_err") && (
                <p className="text-xs text-destructive break-words">{searchParams.get("meta_err")}</p>
              )}
              {isSuperAdmin ? (
                <Button asChild type="button" className="w-full sm:w-auto min-h-10">
                  <a href="/api/integration/meta/oauth/start" rel="noopener noreferrer">
                    {metaStatus?.connected ? "Reconectar com a Meta" : "Conectar com a Meta"}
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Só o super admin pode conectar ou reconectar a Meta.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Rascunhos</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {drafts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-muted"
                    onClick={() => openEditPost(p)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.title || "Sem título"}</p>
                      <p className="text-xs text-muted-foreground truncate">{(p.content || "").slice(0, 50)}{(p.content?.length ?? 0) > 50 ? "…" : ""}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); openEditPost(p); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {drafts.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Nenhum rascunho.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de criar/editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formEdit ? "Editar postagem" : "Nova postagem"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Destino</Label>
              <select
                className={SELECT_NATIVE_CLASS}
                value={formData.tenantId == null ? "group" : formData.tenantId}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((d) => ({ ...d, tenantId: v === "group" ? null : v }));
                }}
              >
                <option value="group">Grupo (BCG)</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Título (opcional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
                placeholder="Título curto para identificação"
              />
            </div>
            <div className="grid gap-2">
              <Label>Conteúdo *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData((d) => ({ ...d, content: e.target.value }))}
                placeholder="Texto da postagem"
                rows={4}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Imagens</Label>
              <div className="flex flex-wrap gap-2">
                {formData.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={plannerMediaThumbSrc(url)}
                      alt=""
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition"
                      onClick={() => removeImage(idx)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <div className="w-20">
                  <MediaPicker
                    value=""
                    onChange={addImage}
                    sizeKey="card"
                    allowAllFolders
                    placeholder="+"
                    refreshTrigger={mediaRefresh}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Plataformas</Label>
              <div className="flex flex-wrap gap-4">
                {["facebook", "instagram", "linkedin"].map((pl) => {
                  const Icon = PLATFORM_ICONS[pl];
                  return (
                    <label key={pl} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.platforms.includes(pl)}
                        onCheckedChange={() => togglePlatform(pl)}
                      />
                      {Icon && <Icon className="h-4 w-4" />}
                      <span className="capitalize">{pl}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Data e hora (agendamento)</Label>
              <Input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData((d) => ({ ...d, scheduledAt: e.target.value }))}
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                className={SELECT_NATIVE_CLASS}
                value={formData.status}
                onChange={(e) => setFormData((d) => ({ ...d, status: e.target.value }))}
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Notas internas"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2 order-2 sm:order-1">
              {isSuperAdmin && formEdit?.id && metaStatus?.connected && (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10"
                  disabled={publishingFb || !formData.content.trim()}
                  onClick={handlePublishFacebook}
                >
                  {publishingFb ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Facebook className="h-4 w-4 mr-2" />}
                  Publicar no Facebook
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-end order-1 sm:order-2">
            {formEdit && (
              <Button
                variant="destructive"
                onClick={() => handleDelete(formEdit.id)}
                disabled={deletingId === formEdit.id}
              >
                {deletingId === formEdit.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
