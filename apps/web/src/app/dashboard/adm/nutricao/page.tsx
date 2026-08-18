"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UtensilsCrossed,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Coffee,
  ClipboardList,
  Calendar,
  Scale,
  Pill,
  FileText,
  Printer,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { getCategoryLabel } from "@/lib/fixture-categories";
import type { NutritionCategoryRow } from "./components/NutritionCategoryFormDialog";
import { NutritionMealTypeFormDialog, type NutritionMealTypeRow } from "./components/NutritionMealTypeFormDialog";
import { NutritionMenuFormDialog, type NutritionMenuRow } from "./components/NutritionMenuFormDialog";
import {
  NutritionCalendarFormDialog,
  type NutritionCalendarEntryRow,
} from "./components/NutritionCalendarFormDialog";
import {
  NutritionAssessmentFormDialog,
  type NutritionAssessmentRow,
} from "./components/NutritionAssessmentFormDialog";
import {
  SupplementGuideFormDialog,
  type SupplementGuideRow,
} from "./components/SupplementGuideFormDialog";
import { NutritionMenuItemsDialog } from "@/components/dashboard/nutricao/NutritionMenuItemsDialog";
import { NutritionAnamnesesListPanel } from "@/components/dashboard/nutricao/NutritionAnamnesesListPanel";
import { NutricaoRelatoriosPanel } from "@/components/dashboard/nutricao/NutricaoRelatoriosPanel";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type TabId = "tipos" | "menus" | "calendario" | "avaliacoes" | "suplementacao" | "anamneses" | "relatorios";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "tipos", label: "Tipos de refeição", icon: Coffee },
  { id: "menus", label: "Cardápios", icon: ClipboardList },
  { id: "calendario", label: "Calendário", icon: Calendar },
  { id: "avaliacoes", label: "Avaliações", icon: Scale },
  { id: "suplementacao", label: "Suplementação", icon: Pill },
  { id: "anamneses", label: "Anamneses", icon: FileText },
  { id: "relatorios", label: "Relatórios", icon: Printer },
];

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  bodyFatPercent?: number | null;
}

export default function AdmNutricaoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("tipos");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<NutritionCategoryRow[]>([]);
  const [mealTypes, setMealTypes] = useState<NutritionMealTypeRow[]>([]);
  const [menus, setMenus] = useState<NutritionMenuRow[]>([]);
  const [calendar, setCalendar] = useState<NutritionCalendarEntryRow[]>([]);
  const [assessments, setAssessments] = useState<NutritionAssessmentRow[]>([]);
  const [supplementGuides, setSupplementGuides] = useState<SupplementGuideRow[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<NutritionCategoryRow | null>(null);
  const [mealTypeDialogOpen, setMealTypeDialogOpen] = useState(false);
  const [mealTypeEdit, setMealTypeEdit] = useState<NutritionMealTypeRow | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuEdit, setMenuEdit] = useState<NutritionMenuRow | null>(null);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [calendarEdit, setCalendarEdit] = useState<NutritionCalendarEntryRow | null>(null);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [assessmentEdit, setAssessmentEdit] = useState<NutritionAssessmentRow | null>(null);
  const [supplementDialogOpen, setSupplementDialogOpen] = useState(false);
  const [supplementEdit, setSupplementEdit] = useState<SupplementGuideRow | null>(null);
  const [menuItemsMenu, setMenuItemsMenu] = useState<NutritionMenuRow | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const [deleteKind, setDeleteKind] = useState<
    "mealType" | "menu" | "calendar" | "assessment" | "supplement" | null
  >(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<NutritionCategoryRow[]>(`/nutricao/nutrition-categories${qs}`);
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, [tenantId]);

  /** Carrega categorias de um tenant e mescla no state (para os diálogos terem opções ao trocar de clube) */
  const ensureCategoriesForTenant = useCallback(async (tid: string) => {
    if (!tid) return;
    try {
      const { data } = await api.get<NutritionCategoryRow[]>(
        `/nutricao/nutrition-categories?tenantId=${encodeURIComponent(tid)}`
      );
      const list = Array.isArray(data) ? data : [];
      setCategories((prev) => {
        const others = prev.filter((c) => c.tenant.id !== tid);
        return [...others, ...list];
      });
    } catch {
      // ignore
    }
  }, []);

  const loadMealTypes = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<NutritionMealTypeRow[]>(`/nutricao/nutrition-meal-types${qs}`);
      setMealTypes(Array.isArray(data) ? data : []);
    } catch {
      setMealTypes([]);
    }
  }, [tenantId]);

  const loadMenus = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<NutritionMenuRow[]>(`/nutricao/nutrition-menus${qs}`);
      setMenus(Array.isArray(data) ? data : []);
    } catch {
      setMenus([]);
    }
  }, [tenantId]);

  const loadCalendar = useCallback(async () => {
    if (!tenantId) {
      setCalendar([]);
      return;
    }
    try {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 2);
      const params = new URLSearchParams({
        tenantId,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
      const { data } = await api.get<NutritionCalendarEntryRow[]>(
        `/nutricao/nutrition-calendar?${params}`
      );
      setCalendar(Array.isArray(data) ? data : []);
    } catch {
      setCalendar([]);
    }
  }, [tenantId]);

  const loadAssessments = useCallback(async () => {
    if (!tenantId) {
      setAssessments([]);
      return;
    }
    try {
      const { data } = await api.get<NutritionAssessmentRow[]>(
        `/nutricao/nutrition-assessments?tenantId=${encodeURIComponent(tenantId)}`
      );
      setAssessments(Array.isArray(data) ? data : []);
    } catch {
      setAssessments([]);
    }
  }, [tenantId]);

  const loadSupplementGuides = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<SupplementGuideRow[]>(`/nutricao/supplement-guides${qs}`);
      setSupplementGuides(Array.isArray(data) ? data : []);
    } catch {
      setSupplementGuides([]);
    }
  }, [tenantId]);

  const loadPlayers = useCallback(async () => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    try {
      const { data } = await api.get<PlayerOption[]>(
        `/players?tenantId=${encodeURIComponent(tenantId)}`
      );
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    }
  }, [tenantId]);

  const reloadAll = useCallback(() => {
    loadCategories();
    loadMealTypes();
    loadMenus();
    loadCalendar();
    loadAssessments();
    loadSupplementGuides();
  }, [loadCategories, loadMealTypes, loadMenus, loadCalendar, loadAssessments, loadSupplementGuides]);

  useEffect(() => {
    if (!canAccessModule("adm_nutricao") && !authLoading) return;
    loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (!canAccessModule("adm_nutricao")) return;
    setLoading(true);
    if (activeTab === "tipos") loadMealTypes().finally(() => setLoading(false));
    else if (activeTab === "menus") loadMenus().finally(() => setLoading(false));
    else if (activeTab === "calendario") loadCalendar().finally(() => setLoading(false));
    else if (activeTab === "avaliacoes") loadAssessments().finally(() => setLoading(false));
    else if (activeTab === "suplementacao") loadSupplementGuides().finally(() => setLoading(false));
    else setLoading(false);
  }, [activeTab, tenantId, canAccessModule, loadCategories, loadMealTypes, loadMenus, loadCalendar, loadAssessments, loadSupplementGuides]);

  useEffect(() => {
    loadCategories();
    loadMealTypes();
    loadMenus();
    loadCalendar();
    loadAssessments();
    loadSupplementGuides();
  }, [tenantId, loadCategories, loadMealTypes, loadMenus, loadCalendar, loadAssessments, loadSupplementGuides]);

  useEffect(() => {
    loadPlayers();
  }, [tenantId, loadPlayers]);

  const handleDeleteConfirm = async () => {
    if (!deleteKind || !deleteId) return;
    setDeleting(true);
    try {
      if (deleteKind === "mealType") await api.delete(`/nutricao/nutrition-meal-types/${deleteId}`);
      if (deleteKind === "menu") await api.delete(`/nutricao/nutrition-menus/${deleteId}`);
      if (deleteKind === "calendar") await api.delete(`/nutricao/nutrition-calendar/${deleteId}`);
      if (deleteKind === "assessment") await api.delete(`/nutricao/nutrition-assessments/${deleteId}`);
      if (deleteKind === "supplement") await api.delete(`/nutricao/supplement-guides/${deleteId}`);
      reloadAll();
      setDeleteKind(null);
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao excluir",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!canAccessModule("adm_nutricao") && !authLoading) {
    router.replace("/403");
    return null;
  }

  const effectiveTenantId = tenantId || (tenants[0]?.id ?? "");
  const tenantName = tenants.find((t) => t.id === effectiveTenantId)?.name;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao dashboard
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Nutrição</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid gap-2 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground">Clube/Empresa</label>
                <Select
                  value={tenantId || "__all__"}
                  onValueChange={(v) => setTenantId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 border-b flex-wrap">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="h-4 w-4 mr-1" />
                  {tab.label}
                </Button>
              ))}
            </div>

            {activeTab === "tipos" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setMealTypeEdit(null); setMealTypeDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo tipo
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !tenantId && tenants.length > 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Ordem</TableHead>
                          <TableHead>Clube/Empresa</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mealTypes.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell>{m.code}</TableCell>
                            <TableCell>{m.sortOrder}</TableCell>
                            <TableCell>{m.tenant.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMealTypeEdit(m); setMealTypeDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("mealType"); setDeleteId(m.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "menus" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setMenuEdit(null); setMenuDialogOpen(true); }} disabled={!effectiveTenantId && tenants.length > 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo cardápio
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !tenantId && tenants.length > 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Contexto</TableHead>
                          <TableHead>Clube/Empresa</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {menus.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell>{m.category?.name ?? "—"}</TableCell>
                            <TableCell>{m.dayContext ?? "—"}</TableCell>
                            <TableCell>{m.tenant.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Itens do cardápio" onClick={() => setMenuItemsMenu(m)}>
                                  <List className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMenuEdit(m); setMenuDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("menu"); setDeleteId(m.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "calendario" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setCalendarEdit(null); setCalendarDialogOpen(true); }} disabled={!effectiveTenantId}>
                    <Plus className="h-4 w-4 mr-2" />
                    Definir cardápio do dia
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !tenantId ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa para ver o calendário.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Cardápio</TableHead>
                          <TableHead>Contexto</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calendar.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{formatDateDayMonYear(e.date)}</TableCell>
                            <TableCell>{e.category?.name ?? "—"}</TableCell>
                            <TableCell>{e.menu?.name ?? "—"}</TableCell>
                            <TableCell>{e.dayContext ?? "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCalendarEdit(e); setCalendarDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("calendar"); setDeleteId(e.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "avaliacoes" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setAssessmentEdit(null); setAssessmentDialogOpen(true); }} disabled={!effectiveTenantId}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova avaliação
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !tenantId ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jogador</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Peso (kg)</TableHead>
                          <TableHead>IMC</TableHead>
                          <TableHead>% Gordura</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">
                              {a.player?.name ?? "—"} {a.player?.jerseyNumber != null ? `#${a.player.jerseyNumber}` : ""}
                              {a.player?.category ? ` • ${getCategoryLabel(a.player.category, "pt")}` : ""}
                            </TableCell>
                            <TableCell>{formatDateDayMonYear(a.assessedAt)}</TableCell>
                            <TableCell>{a.weightKg}</TableCell>
                            <TableCell>{a.bmi ?? "—"}</TableCell>
                            <TableCell>{a.bodyFatPercent ?? "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAssessmentEdit(a); setAssessmentDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("assessment"); setDeleteId(a.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "suplementacao" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setSupplementEdit(null); setSupplementDialogOpen(true); }} disabled={!effectiveTenantId && tenants.length > 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo guia
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !tenantId && tenants.length > 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Escopo</TableHead>
                          <TableHead>Quando tomar</TableHead>
                          <TableHead>Clube/Empresa</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplementGuides.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{g.name}</TableCell>
                            <TableCell>
                              {g.playerId && g.player
                                ? `${g.player.name} ${g.player.jerseyNumber != null ? `#${g.player.jerseyNumber}` : ""}${g.player.category ? ` • ${getCategoryLabel(g.player.category, "pt")}` : ""}`
                                : g.categoryId && g.category
                                  ? g.category.name
                                  : "Time todo"}
                            </TableCell>
                            <TableCell>{g.whenToTake ?? "—"}</TableCell>
                            <TableCell>{g.tenant.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSupplementEdit(g); setSupplementDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("supplement"); setDeleteId(g.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "anamneses" && (
              <NutritionAnamnesesListPanel
                tenantId={effectiveTenantId}
                players={players}
                tenantName={tenantName}
              />
            )}

            {activeTab === "relatorios" && (
              <NutricaoRelatoriosPanel
                tenantId={effectiveTenantId}
                categories={categories}
                players={players}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <NutritionMealTypeFormDialog
        open={mealTypeDialogOpen}
        onOpenChange={setMealTypeDialogOpen}
        tenants={tenants}
        edit={mealTypeEdit}
        onSuccess={reloadAll}
      />
      <NutritionMenuFormDialog
        open={menuDialogOpen}
        onOpenChange={setMenuDialogOpen}
        tenants={tenants}
        categories={categories}
        tenantId={effectiveTenantId}
        ensureCategoriesForTenant={ensureCategoriesForTenant}
        edit={menuEdit}
        onSuccess={reloadAll}
      />
      <NutritionCalendarFormDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        tenants={tenants}
        categories={categories}
        menus={menus}
        tenantId={effectiveTenantId}
        ensureCategoriesForTenant={ensureCategoriesForTenant}
        edit={calendarEdit}
        onSuccess={reloadAll}
      />
      <NutritionAssessmentFormDialog
        open={assessmentDialogOpen}
        onOpenChange={setAssessmentDialogOpen}
        players={players}
        edit={assessmentEdit}
        onSuccess={reloadAll}
      />
      <SupplementGuideFormDialog
        open={supplementDialogOpen}
        onOpenChange={setSupplementDialogOpen}
        tenants={tenants}
        categories={categories}
        players={players}
        tenantId={effectiveTenantId}
        ensureCategoriesForTenant={ensureCategoriesForTenant}
        edit={supplementEdit}
        onSuccess={reloadAll}
      />

      <NutritionMenuItemsDialog
        open={!!menuItemsMenu}
        onOpenChange={(open) => !open && setMenuItemsMenu(null)}
        menu={menuItemsMenu}
        mealTypes={mealTypes}
      />

      <AlertDialog open={!!deleteKind} onOpenChange={(open) => !open && setDeleteKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
