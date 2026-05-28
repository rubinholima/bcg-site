"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  Loader2,
  Plus,
  Linkedin,
  Instagram,
  Twitter,
  Globe,
  User,
  CalendarIcon,
  Eye,
  EyeOff,
  Facebook,
  Youtube,
  Music,
} from "lucide-react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  HomeContentBlock,
  HomeBlockType,
  HeroCarouselEffect,
  HeroSlide,
  HeroCarouselIntervalSeconds,
  CtaButtonConfig,
  GlobalPresenceLocation,
  GlobalPresenceCounter,
} from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import { HERO_RECOMMENDED_DIMENSIONS } from "@/types/home-content";
import { getCtaPresetContent, CTA_PRESET_OPTIONS, type CtaPresetId } from "@/lib/cta-presets";
import type { Page, PageTheme } from "@/types/page";
import {
  getBlockLabel,
  type ModuleCategory,
  MODULE_TYPE_FILTER_EVENTOS,
  resolveModuleCategoryFromFilter,
  resolveModuleFilterLabel,
  getMiddleModuleOptionsForCategory,
  createBlock,
  BLOCK_TYPES_WITH_BODY,
  mergeGlobalPresenceCounters,
} from "@/lib/home-content";
import { BCH_SLUG, bchLogoSrc } from "@/lib/boston-city-hall";
import { api } from "@/lib/api";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { FontFamilyField, PageBuilderChrome, PageThemePanel, HeroModuleEditor, ModuleTitleGradientFields, normalizeBlocks, sanitizeBlocksForSave } from "@/components/dashboard/page-builder";
import { ProximosJogosModuleEditor } from "@/components/dashboard/ProximosJogosModuleEditor";
import { UltimosResultadosModuleEditor } from "@/components/dashboard/UltimosResultadosModuleEditor";
import { SelectWithCreate } from "@/components/dashboard/SelectWithCreate";
import { authFetch } from "@/lib/authFetch";
import { getPublicImageUrl } from "@/lib/media-url";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import { FOOTBALL_POSITIONS } from "@/lib/football-positions";
import { fetchFixtures, type FixtureItem } from "@/lib/fixtures-shared";

// Meses abreviados em português
const MONTHS_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Função para formatar data DD/MMM/YYYY
function formatDateToDDMMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  // Se já está no formato dd/mmm/yyyy, retorna como está
  if (/^\d{1,2}\/[a-z]{3}\/\d{4}$/.test(dateStr)) return dateStr;
  // Se está no formato YYYY-MM-DD, converte
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx < 0 || monthIdx >= MONTHS_ABBR.length) return dateStr;
    return `${parseInt(day, 10)}/${MONTHS_ABBR[monthIdx]}/${year}`;
  }
  // Tenta parsear como Date
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const monthIdx = date.getMonth();
    const year = date.getFullYear();
    return `${day}/${MONTHS_ABBR[monthIdx]}/${year}`;
  } catch {
    return dateStr;
  }
}

/** Busca todos os vídeos de uma playlist do YouTube e chama onImport com as URLs. */
function PlaylistImporter({ onImport }: { onImport: (urls: string[]) => void }) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    const url = playlistUrl.trim();
    if (!url) {
      setError("Cole a URL da playlist do YouTube.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/youtube/playlist?${new URLSearchParams({ url }).toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Erro ao buscar playlist.");
        return;
      }
      const videos = (data.videos ?? []) as Array<{ url: string }>;
      const urls = videos.map((v) => v.url).filter(Boolean);
      if (urls.length === 0) {
        setError("Nenhum vídeo encontrado na playlist.");
        return;
      }
      onImport(urls);
      setPlaylistUrl("");
      setError(null);
    } catch {
      setError("Falha na requisição. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/20 p-2">
      <Input
        className="h-8 flex-1 min-w-[160px] text-xs"
        placeholder="URL da playlist do YouTube"
        value={playlistUrl}
        onChange={(e) => setPlaylistUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleFetch()}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 text-xs"
        onClick={handleFetch}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Youtube className="h-3 w-3 mr-1" />
        )}
        {loading ? "Buscando…" : "Buscar e adicionar todos"}
      </Button>
      {error && (
        <span className="text-xs text-destructive w-full">{error}</span>
      )}
    </div>
  );
}

// Função para converter DD/MMM/YYYY para YYYY-MM-DD
function parseDDMMMYYYYToDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const [day, monthAbbr, year] = parts;
  const monthIdx = MONTHS_ABBR.findIndex((m) => m.toLowerCase() === monthAbbr.toLowerCase());
  if (monthIdx === -1) return dateStr;
  if (year.length !== 4) return dateStr;
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}


type HeaderPreset = "classic" | "centered" | "minimal" | "overlay" | "sticky" | "split";

const HEADER_PRESET_OPTIONS: { value: HeaderPreset; label: string }[] = [
  { value: "classic", label: "Classic (logo esquerda, links direita)" },
  { value: "centered", label: "Centered (logo+nome central, links abaixo)" },
  { value: "minimal", label: "Minimal (compacto, poucos links)" },
  { value: "overlay", label: "Overlay (transparente sobre o hero)" },
  { value: "sticky", label: "Sticky (fixo no topo ao scroll)" },
  { value: "split", label: "Split (logo | links | ações)" },
];

/** Valores aplicados ao trocar o preset (sobrescreve, exceto headerLinks). */
const HEADER_PRESET_VALUES: Record<HeaderPreset, Record<string, unknown>> = {
  classic: {
    headerPreset: "classic",
    backgroundMode: "solid",
    backgroundColor: "#18181b",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  centered: {
    headerPreset: "centered",
    backgroundMode: "solid",
    backgroundColor: "#0b1220",
    headerTextColor: "#ffffff",
    linkStyle: "pill",
    logoSize: "lg",
    sticky: false,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    showLanguage: true,
    showHomeLink: true,
  },
  minimal: {
    headerPreset: "minimal",
    backgroundMode: "transparent",
    backgroundColor: undefined,
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "sm",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  overlay: {
    headerPreset: "overlay",
    backgroundMode: "blur",
    backgroundColor: undefined,
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  sticky: {
    headerPreset: "sticky",
    backgroundMode: "solid",
    backgroundColor: "#0b1220",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: true,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.1)",
    showLanguage: true,
    showHomeLink: true,
  },
  split: {
    headerPreset: "split",
    backgroundMode: "solid",
    backgroundColor: "#111827",
    headerTextColor: "#ffffff",
    linkStyle: "button",
    logoSize: "md",
    sticky: false,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    showLanguage: true,
    showHomeLink: true,
  },
};

/** Aplica valores do preset ao config, sobrescrevendo campos visuais. NÃO sobrescreve headerLinks. */
function applyHeaderPresetOverwrite(
  preset: HeaderPreset,
  currentConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const presetValues = HEADER_PRESET_VALUES[preset] ?? HEADER_PRESET_VALUES.classic;
  const existingLinks = Array.isArray((currentConfig ?? {}).headerLinks) ? (currentConfig as { headerLinks: unknown }).headerLinks : [];
  const merged = { ...(currentConfig ?? {}), ...presetValues };
  merged.headerLinks = existingLinks;
  return merged;
}

export default function EditarPaginaTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [headerAdvanced, setHeaderAdvanced] = useState(false);
  const [headerDebug, setHeaderDebug] = useState(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());
  const [globalAppearanceOpen, setGlobalAppearanceOpen] = useState(false);
  const [overlayOpacityDraft, setOverlayOpacityDraft] = useState<string | null>(null);
  const [pastFixturesByBlock, setPastFixturesByBlock] = useState<Record<string, FixtureItem[]>>({});
  const [loadingPastFixtures, setLoadingPastFixtures] = useState<string | null>(null);
  const [syncingTabelaBlockIndex, setSyncingTabelaBlockIndex] = useState<number | null>(null);
  const [moduleTypeFilter, setModuleTypeFilter] = useState<"geral" | string>("geral");
  const dateInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const proximosJogosUrlRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const proximosJogosGidRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const blocks = normalizeBlocks(page?.content?.blocks ?? []);

  /** Na página de clube/empresa: Geral, Eventos e o tipo do tenant (se houver). */
  const tenantKind = page?.tenant?.kind;
  const allowedTypeOptions = [
    { value: "geral" as const, label: "Geral" },
    { value: MODULE_TYPE_FILTER_EVENTOS, label: "Eventos" },
    ...(tenantKind ? [{ value: tenantKind.id, label: tenantKind.name }] : []),
  ];

  const resolvedModuleCategory: ModuleCategory = resolveModuleCategoryFromFilter(moduleTypeFilter, {
    tenantKind,
  });
  const resolvedModuleLabel = resolveModuleFilterLabel(moduleTypeFilter, { tenantKind });

  const toggleBlockCollapsed = (blockId: string) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/pages/tenant/${encodeURIComponent(tenantId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error((d as { error?: string })?.error ?? "Erro ao carregar página")));
        return r.json();
      })
      .then((data: Page | null) => {
        if (!cancelled && data?.content) {
          const normalized = normalizeBlocks(data.content.blocks ?? []);
          setPage({
            ...data,
            content: {
              ...data.content,
              blocks: normalized,
            },
          });
          setCollapsedBlockIds(new Set(normalized.filter((b) => b.type !== "hero").map((b) => b.id)));
          if (data.tenant?.slug === BCH_SLUG) {
            setModuleTypeFilter(MODULE_TYPE_FILTER_EVENTOS);
          }
        } else if (!cancelled) {
          setPage(data);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  /** Garante que moduleTypeFilter está permitido (Geral, Eventos ou tipo do tenant). */
  useEffect(() => {
    const ok =
      moduleTypeFilter === "geral" ||
      moduleTypeFilter === MODULE_TYPE_FILTER_EVENTOS ||
      (tenantKind && moduleTypeFilter === tenantKind.id);
    if (!ok && moduleTypeFilter) setModuleTypeFilter("geral");
  }, [tenantKind?.id, moduleTypeFilter]);

  const setBlocks = (newBlocks: HomeContentBlock[]) => {
    const normalized = normalizeBlocks(newBlocks);
    setPage((prev) =>
      prev
        ? {
            ...prev,
            content: { ...prev.content, blocks: normalized },
          }
        : null,
    );
  };

  const theme = page?.content?.theme ?? {};
  const updateTheme = (key: keyof PageTheme, value: string | number | undefined) => {
    const normalized = value === undefined || value === null || value === "" ? undefined : value;
    setPage((prev) =>
      prev
        ? {
            ...prev,
            content: {
              ...prev.content,
              theme: { ...(prev.content.theme ?? {}), [key]: normalized },
            },
          }
        : null,
    );
  };

  const moveBlockTo = (fromIndex: number, toIndex: number) => {
    if (fromIndex <= 0 || fromIndex >= blocks.length - 1) return;
    if (toIndex <= 0 || toIndex >= blocks.length - 1) return;
    if (fromIndex === toIndex) return;
    const next = [...blocks];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    const withOrder = next.map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(withOrder);
  };

  const updateBlockConfig = (
    index: number,
    key: string,
    value: string | undefined,
  ) => {
    const list = [...blocks];
    const block = list[index];
    if (!block) return;
    const config = { ...(block.config ?? {}), [key]: value || undefined };
    list[index] = { ...block, config };
    setBlocks(list);
  };

  const updateBlockConfigValue = (index: number, key: string, value: BlockConfigValue) => {
    const list = [...blocks];
    const block = list[index];
    if (!block) return;
    const config = { ...(block.config ?? {}), [key]: value };
    list[index] = { ...block, config };
    setBlocks(list);
  };

  /** Atualiza vários config de uma vez (evita que a segunda chamada sobrescreva a primeira). */
  const updateBlockConfigValues = (index: number, updates: Record<string, BlockConfigValue>) => {
    const list = [...blocks];
    const block = list[index];
    if (!block) return;
    const config = { ...(block.config ?? {}), ...updates };
    list[index] = { ...block, config };
    setBlocks(list);
  };

  const addModule = (type: HomeBlockType) => {
    if (type === "header" || type === "footer") return;
    const newBlock = createBlock(type, blocks.length - 1);
    const beforeFooter = blocks.slice(0, -1);
    setBlocks([...beforeFooter, newBlock, blocks[blocks.length - 1]!]);
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (type === "hero") next.delete(newBlock.id);
      else next.add(newBlock.id);
      return next;
    });
  };

  const removeBlock = (index: number) => {
    if (index <= 0 || index >= blocks.length - 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  type SectionColumn = "left" | "middle" | "right";
  const sectionColumnKey = (col: SectionColumn) => col === "left" ? "sectionLeftModules" : col === "middle" ? "sectionMiddleModules" : "sectionRightModules";
  const addModuleToSection = (
    sectionIndex: number,
    column: SectionColumn,
    type: HomeBlockType,
  ) => {
    if (type === "header" || type === "footer" || type === "section") return;
    const list = [...blocks];
    const block = list[sectionIndex];
    if (!block || block.type !== "section") return;
    const key = sectionColumnKey(column);
    const modules = ((block.config?.[key] as HomeContentBlock[]) ?? []) as HomeContentBlock[];
    const newBlock = createBlock(type, modules.length);
    const updated = [...modules, newBlock];
    const config = { ...(block.config ?? {}), [key]: updated };
    list[sectionIndex] = { ...block, config };
    setBlocks(list);
  };

  const removeModuleFromSection = (
    sectionIndex: number,
    column: SectionColumn,
    moduleIndex: number,
  ) => {
    const list = [...blocks];
    const block = list[sectionIndex];
    if (!block || block.type !== "section") return;
    const key = sectionColumnKey(column);
    const modules = ((block.config?.[key] as HomeContentBlock[]) ?? []) as HomeContentBlock[];
    const updated = modules.filter((_, i) => i !== moduleIndex);
    const config = { ...(block.config ?? {}), [key]: updated };
    list[sectionIndex] = { ...block, config };
    setBlocks(list);
  };

  const updateSectionModuleConfig = (
    sectionIndex: number,
    column: SectionColumn,
    moduleIndex: number,
    key: string,
    value: unknown,
  ) => {
    const list = [...blocks];
    const block = list[sectionIndex];
    if (!block || block.type !== "section") return;
    const configKey = sectionColumnKey(column);
    const modules = [...((block.config?.[configKey] as HomeContentBlock[]) ?? [])];
    const mod = modules[moduleIndex];
    if (!mod) return;
    modules[moduleIndex] = { ...mod, config: { ...(mod.config ?? {}), [key]: value } };
    const config = { ...(block.config ?? {}), [configKey]: modules };
    list[sectionIndex] = { ...block, config };
    setBlocks(list);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payloadBlocks = sanitizeBlocksForSave(blocks);
      const res = await authFetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { theme: page.content.theme, blocks: payloadBlocks },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data as { error?: string; message?: string })?.error ??
          (data as { message?: string })?.message ??
          "Erro ao salvar";
        if (process.env.NODE_ENV === "development") {
          console.error("[tenant page save]", res.status, data);
        }
        throw new Error(msg);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">
          Página não encontrada. Crie a página desta empresa em Páginas.
        </p>
        <Link href="/dashboard/paginas">
          <Button variant="outline">Voltar para Páginas</Button>
        </Link>
      </div>
    );
  }

  const tenantName = page.tenant?.name ?? "Empresa";
  const subjectLogoSrc = page.tenant
    ? page.tenant.slug === BCH_SLUG
      ? bchLogoSrc(page.tenant.logoUrl)
      : page.tenant.logoUrl
        ? getPublicImageUrl(page.tenant.logoUrl) || ""
        : ""
    : "";

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <PageBuilderChrome
        title={tenantName}
        subtitle="Módulos, aparência global e textos PT/EN."
        previewHref={page?.tenant?.slug ? `/portfolio/${page.tenant.slug}` : undefined}
        previewLabel="Ver página"
        saving={saving}
        success={success}
        error={error}
        formId="editor-tenant-page-form"
        subjectLogo={subjectLogoSrc ? { src: subjectLogoSrc, alt: tenantName } : null}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Página salva com sucesso.
        </div>
      )}

      <form id="editor-tenant-page-form" onSubmit={handleSubmit} className="space-y-6">
        <PageThemePanel
          theme={theme}
          open={globalAppearanceOpen}
          onOpenChange={setGlobalAppearanceOpen}
          updateTheme={updateTheme}
          overlayOpacityDraft={overlayOpacityDraft}
          setOverlayOpacityDraft={setOverlayOpacityDraft}
        />

        <Card>
          <CardHeader>
            <CardTitle>Módulos da página</CardTitle>
            <CardDescription>
              Adicione módulos no dropdown. Em cada módulo: cor de fundo, opacidade do overlay, imagem de fundo, título em PT e EN (e corpo/imagem para texto e custom).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="space-y-4">
              {((() => {
                const header = blocks[0];
                const footer = blocks[blocks.length - 1];
                const middleBlocks = blocks.slice(1, -1).map((block, i) => ({ block, index: i + 1 }));
                const visibleMiddle = middleBlocks.filter(({ block }) => block.config?.visible !== false);
                const hiddenMiddle = middleBlocks.filter(({ block }) => block.config?.visible === false);
                const footerHidden = footer && footer.config?.visible === false;
                const rows: Array<
                  | { type: "block"; block: HomeContentBlock; index: number; hidden: boolean }
                  | { type: "add" }
                > = [
                  ...(header ? [{ type: "block" as const, block: header, index: 0, hidden: false }] : []),
                  ...visibleMiddle.map(({ block, index }) => ({ type: "block" as const, block, index, hidden: false })),
                  { type: "add" },
                  ...hiddenMiddle.map(({ block, index }) => ({ type: "block" as const, block, index, hidden: true })),
                  ...(footer && !footerHidden ? [{ type: "block" as const, block: footer, index: blocks.length - 1, hidden: false }] : []),
                  ...(footerHidden ? [{ type: "block" as const, block: footer, index: blocks.length - 1, hidden: true }] : []),
                ];
                return rows.map((row) => {
                  if (row.type === "add") {
                    return (
                      <div key="add-module" className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-red-500/50 bg-red-500/15 dark:bg-red-950/50 px-3 py-4">
                        <span className="text-sm font-semibold text-muted-foreground">Tipo de negócio:</span>
                        <Select value={moduleTypeFilter} onValueChange={(v) => setModuleTypeFilter(v)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedTypeOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm font-semibold text-muted-foreground ml-2">Adicionar módulo:</span>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) addModule(value as HomeBlockType);
                          }}
                        >
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder={`${resolvedModuleLabel}…`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup key={resolvedModuleCategory}>
                              <SelectLabel className="text-xs font-semibold text-muted-foreground">{resolvedModuleLabel}</SelectLabel>
                              {getMiddleModuleOptionsForCategory(resolvedModuleCategory).map((opt) => (
                                <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  const { block, index, hidden } = row;
                  const isHeader = index === 0;
                  const isFooter = index === blocks.length - 1;
                  const isPositionLocked = isHeader || isFooter;
                  const sectionLabel = isHeader
                    ? "Cabeçalho"
                    : isFooter
                      ? "Rodapé"
                      : `Módulo — ${getBlockLabel(block.id, block.type as HomeBlockType, "pt")}`;
                  const isExpanded = !collapsedBlockIds.has(block.id);
                  const cardClassName = isHeader
                    ? `module-card flex flex-col gap-3 rounded-lg border-2 border-emerald-500/50 bg-emerald-950/30 p-3 overflow-hidden ${isExpanded ? "ring-2 ring-white/90" : ""}`
                    : isFooter
                      ? `module-card flex flex-col gap-3 rounded-lg border-2 border-sky-500/40 bg-sky-950/20 p-3 overflow-hidden ${isExpanded ? "ring-2 ring-white/90" : ""}`
                      : `module-card flex flex-col gap-3 rounded-lg bg-muted/30 p-3 overflow-hidden ${isExpanded ? "border-2 border-white/90 ring-2 ring-white/70" : "border border-border"}`;
                  return (
                    <Fragment key={block.id}>
                      <div
                        className={hidden ? "rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-950/20 p-2 opacity-60" : ""}
                      >
                        {hidden && (
                          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            Fora da página (oculto) — clique no olho para exibir de novo
                          </p>
                        )}
                        <div
                          className={cardClassName}
                  onDragEnter={!isPositionLocked ? (e) => e.preventDefault() : undefined}
                  onDragOver={!isPositionLocked ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  } : undefined}
                  onDrop={!isPositionLocked ? (e) => {
                    e.preventDefault();
                    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                    if (Number.isNaN(from) || from === index) return;
                    moveBlockTo(from, index);
                  } : undefined}
                >
                  <div className="flex items-center gap-2">
                    {!isPositionLocked && (
                      <div
                        draggable
                        className="flex shrink-0 cursor-grab items-center active:cursor-grabbing"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(index));
                          e.dataTransfer.effectAllowed = "move";
                          (e.currentTarget as HTMLElement).closest(".module-card")?.classList.add("opacity-60");
                        }}
                        onDragEnd={(e) => {
                          (e.currentTarget as HTMLElement).closest(".module-card")?.classList.remove("opacity-60");
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                    <button
                      type="button"
                      className="flex min-h-[44px] flex-1 items-center gap-2 rounded-md px-1 text-left transition-colors hover:bg-muted/40"
                      onClick={() => toggleBlockCollapsed(block.id)}
                    >
                      {isHeader ? (
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Fixo
                        </span>
                      ) : isFooter ? (
                        <span className="text-xs font-medium uppercase tracking-wide text-sky-400/90">
                          Editável
                        </span>
                      ) : null}
                      <span className="font-medium">{sectionLabel}</span>
                      {collapsedBlockIds.has(block.id) ? (
                        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {!isHeader && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${block.config?.visible === false ? "text-muted-foreground" : "text-amber-500"}`}
                          onClick={() => updateBlockConfigValue(index, "visible", block.config?.visible === false ? true : false)}
                          title={block.config?.visible === false ? "Exibir na página pública" : "Ocultar da página pública"}
                          aria-label={block.config?.visible === false ? "Exibir" : "Ocultar"}
                        >
                          {block.config?.visible === false ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBlock(index)}
                        disabled={isPositionLocked}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!collapsedBlockIds.has(block.id) && (
                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                    <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                      <summary className="cursor-pointer px-3 py-2 font-medium">Aparência do Módulo</summary>
                      <div className="border-t border-border px-3 py-3 grid gap-3 sm:grid-cols-2">
                      {(block.type === "proximos_jogos" || block.type === "noticias" || block.type === "ultimos_resultados" || block.type === "tabela") && (
                        <p className="text-xs text-muted-foreground sm:col-span-2">
                          Deixe cor e imagem de fundo vazios para o fundo da página aparecer continuado (sem bloco separado).
                        </p>
                      )}
                    {block.type !== "header" && (
                      <FontFamilyField
                        className="sm:col-span-2"
                        value={(block.config?.fontFamily as string) ?? ""}
                        onChange={(v) => updateBlockConfig(index, "fontFamily", v)}
                        allowInherit
                        inheritLabel={`Padrão da página (${(theme.fontFamily as string)?.trim() || "Geist Sans"})`}
                      />
                    )}
                    {(block.type !== "header") && (
                      <>
                      <div className="space-y-2">
                        <Label>Largura do conteúdo (box ou full width)</Label>
                        <Select
                          value={(block.config?.contentWidth as string) ?? "inherit"}
                          onValueChange={(v) => updateBlockConfig(index, "contentWidth", v === "inherit" ? undefined : v)}
                        >
                          <SelectTrigger className="max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">Padrão da página ({theme.contentWidth === "full" ? "full width" : "box"})</SelectItem>
                            <SelectItem value="box">Box (centralizado)</SelectItem>
                            <SelectItem value="full">Full width</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Alinhamento do título</Label>
                        <Select
                          value={(block.config?.titleAlign as string) ?? "inherit"}
                          onValueChange={(v) => updateBlockConfig(index, "titleAlign", v === "inherit" ? undefined : v)}
                        >
                          <SelectTrigger className="max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">Padrão da página ({((theme.titleAlign as string) === "center" ? "centro" : (theme.titleAlign as string) === "right" ? "direita" : "esquerda")})</SelectItem>
                            <SelectItem value="left">Esquerda</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="right">Direita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {block.type !== "footer" ? (
                        <div className="space-y-2 sm:col-span-2">
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={
                                block.config?.showModuleBorder === true ||
                                block.config?.showModuleBorder === "true"
                              }
                              onChange={(e) =>
                                updateBlockConfig(
                                  index,
                                  "showModuleBorder",
                                  e.target.checked ? "true" : undefined,
                                )
                              }
                            />
                            Linha separadora abaixo do módulo
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Borda fina cinza entre este módulo e o próximo. Desligado por padrão.
                          </p>
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Label>Cor de fundo (hex)</Label>
                        <p className="text-xs text-muted-foreground">
                          Deixe vazio ou clique em Limpar para fundo transparente (herda do tema da página).
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                            value={
                              (block.config?.backgroundColor as string)?.trim() || "#18181b"
                            }
                            onChange={(e) =>
                              updateBlockConfig(
                                index,
                                "backgroundColor",
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            placeholder="Vazio = transparente"
                            className="flex-1 min-w-[120px]"
                            value={
                              (block.config?.backgroundColor as string) ?? ""
                            }
                            onChange={(e) =>
                              updateBlockConfig(
                                index,
                                "backgroundColor",
                                e.target.value,
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateBlockConfig(index, "backgroundColor", "")}
                          >
                            Limpar
                          </Button>
                        </div>
                      </div>
                      </>
                    )}
                    {block.type !== "header" && block.type !== "global_presence" && block.type !== "logo_carousel" && (
                      <>
                        <div className="space-y-2">
                          <Label>Opacidade overlay (0-1)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            placeholder="0.8"
                            value={
                              (block.config?.backgroundOverlayOpacity as number) ??
                              ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              updateBlockConfig(
                                index,
                                "backgroundOverlayOpacity",
                                v === "" ? undefined : String(Number(v)),
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <MediaPicker
                            label="Imagem de fundo"
                            sizeKey="section_bg"
                            allowAllFolders
                            value={(block.config?.backgroundImage as string) ?? ""}
                            onChange={(url) => updateBlockConfig(index, "backgroundImage", url)}
                            placeholder="Escolher da mídia (fundo de seção)"
                          />
                          <Input
                            className="mt-1"
                            placeholder="Ou cole a URL manualmente"
                            value={(block.config?.backgroundImage as string) ?? ""}
                            onChange={(e) =>
                              updateBlockConfig(index, "backgroundImage", e.target.value)
                            }
                          />
                        </div>
                      </>
                    )}
                    {block.type !== "header" && block.type !== "footer" && block.type !== "global_presence" && block.type !== "logo_carousel" && block.type !== "section" && block.type !== "noticias" && block.type !== "ultimos_resultados" && (
                      <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                        <summary className="cursor-pointer px-3 py-2 font-medium">Tamanho do módulo</summary>
                        <div className="border-t border-border px-3 py-3 space-y-2">
                          <Label>Altura / espaço da seção</Label>
                          <Select
                            value={(block.config?.sectionSize as string) ?? "normal"}
                            onValueChange={(v) => updateBlockConfig(index, "sectionSize", v)}
                          >
                            <SelectTrigger className="w-full max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minimal">Mínimo (máximo compacto)</SelectItem>
                              <SelectItem value="compact">Compacto (menor)</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="large">Grande (mais espaço)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Mínimo e Compacto reduzem o espaço; use para deixar o módulo menor e ganhar espaço na página.
                          </p>
                        </div>
                      </details>
                    )}
                      </div>
                    </details>
                    {block.type === "section" && (
                      <div className="space-y-4 sm:col-span-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Colunas</Label>
                            <Select
                              value={String((block.config?.sectionColumns as number) ?? 2)}
                              onValueChange={(v) => {
                                const cols = v === "1" ? 1 : v === "3" ? 3 : 2;
                                const layout = (block.config?.sectionLayout as string) ?? "50-50";
                                const twoCol = ["50-50", "33-66", "66-33"];
                                const threeCol = ["33-33-33", "25-50-25", "50-25-25", "25-25-50"];
                                const newLayout = cols === 3 ? (threeCol.includes(layout) ? layout : "33-33-33") : (twoCol.includes(layout) ? layout : "50-50");
                                const updates: Record<string, BlockConfigValue> = {
                                  sectionColumns: cols,
                                  sectionLayout: newLayout,
                                };
                                if (cols === 3 && !Array.isArray(block.config?.sectionMiddleModules)) updates.sectionMiddleModules = [];
                                updateBlockConfigValues(index, updates);
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 coluna (empilhado)</SelectItem>
                                <SelectItem value="2">2 colunas (esquerda / direita)</SelectItem>
                                <SelectItem value="3">3 colunas (esquerda / meio / direita)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {((block.config?.sectionColumns as number) ?? 2) >= 2 && (
                            <div className="space-y-2">
                              <Label>Proporção das colunas</Label>
                              <Select
                                value={(block.config?.sectionLayout as string) ?? "50-50"}
                                onValueChange={(v) => updateBlockConfigValue(index, "sectionLayout", v)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(block.config?.sectionColumns as number) === 2 ? (
                                    <>
                                      <SelectItem value="50-50">50% / 50%</SelectItem>
                                      <SelectItem value="33-66">33% / 66%</SelectItem>
                                      <SelectItem value="66-33">66% / 33%</SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem value="33-33-33">33% / 33% / 33%</SelectItem>
                                      <SelectItem value="25-50-25">25% / 50% / 25%</SelectItem>
                                      <SelectItem value="50-25-25">50% / 25% / 25%</SelectItem>
                                      <SelectItem value="25-25-50">25% / 25% / 50%</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Espaço no topo</Label>
                            <Select
                              value={(block.config?.sectionPaddingTop as string) ?? "compact"}
                              onValueChange={(v) => updateBlockConfigValue(index, "sectionPaddingTop", v)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minimal">Mínimo</SelectItem>
                                <SelectItem value="compact">Compacto</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Espaço embaixo</Label>
                            <Select
                              value={(block.config?.sectionPaddingBottom as string) ?? "compact"}
                              onValueChange={(v) => updateBlockConfigValue(index, "sectionPaddingBottom", v)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minimal">Mínimo</SelectItem>
                                <SelectItem value="compact">Compacto</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className={`grid gap-4 ${(block.config?.sectionColumns as number) === 3 ? "sm:grid-cols-3" : (block.config?.sectionColumns as number) === 2 ? "sm:grid-cols-2" : ""}`}>
                          <details className="rounded-lg border border-amber-500/40 bg-amber-500/10">
                            <summary className="cursor-pointer px-3 py-2 font-medium">
                              {(block.config?.sectionColumns as number) === 1 ? "Conteúdo" : "Coluna esquerda"} — {((block.config?.sectionLeftModules as HomeContentBlock[]) ?? []).length} módulo(s)
                            </summary>
                            <div className="border-t border-border px-3 py-3 space-y-2">
                              <div className="grid gap-2 sm:grid-cols-2 pb-2 border-b border-border/50">
                                <div className="space-y-1"><Label className="text-xs">Título da coluna (PT)</Label><Input placeholder="Ex: Próximos jogos" value={(block.config?.sectionLeftColumnTitlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionLeftColumnTitlePt", e.target.value)} className="h-8" /></div>
                                <div className="space-y-1"><Label className="text-xs">Título da coluna (EN)</Label><Input placeholder="Ex: Upcoming matches" value={(block.config?.sectionLeftColumnTitleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionLeftColumnTitleEn", e.target.value)} className="h-8" /></div>
                              </div>
                              <div className="pb-2 border-b border-border/50 space-y-2">
                                <Label className="text-xs">Fundo da coluna (cor ou imagem)</Label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input type="color" className="h-8 w-10 cursor-pointer rounded border" value={((block.config?.sectionLeftColumnBackgroundColor as string)?.trim()) || "#18181b"} onChange={(e) => updateBlockConfig(index, "sectionLeftColumnBackgroundColor", e.target.value)} />
                                  <Input placeholder="Cor (hex) — vazio = transparente" className="h-8 flex-1 min-w-[140px]" value={(block.config?.sectionLeftColumnBackgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionLeftColumnBackgroundColor", e.target.value)} />
                                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateBlockConfig(index, "sectionLeftColumnBackgroundColor", "")}>Limpar cor</Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <MediaPicker sizeKey="section_bg" allowAllFolders value={(block.config?.sectionLeftColumnBackgroundImage as string) ?? ""} onChange={(url) => updateBlockConfig(index, "sectionLeftColumnBackgroundImage", url)} placeholder="Imagem de fundo" />
                                  <Input placeholder="Ou URL da imagem" className="h-8 flex-1 min-w-0" value={(block.config?.sectionLeftColumnBackgroundImage as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionLeftColumnBackgroundImage", e.target.value)} />
                                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateBlockConfig(index, "sectionLeftColumnBackgroundImage", "")}>Limpar img</Button>
                                </div>
                                {(block.config?.sectionLeftColumnBackgroundImage as string)?.trim() && (
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs shrink-0">Overlay (0–1):</Label>
                                    <Input type="number" min={0} max={1} step={0.1} className="h-8 w-20" placeholder="0.75" value={(block.config?.sectionLeftColumnBackgroundOverlayOpacity as number) ?? ""} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "sectionLeftColumnBackgroundOverlayOpacity", v === "" ? undefined : Number(v)); }} />
                                  </div>
                                )}
                              </div>
                              {((block.config?.sectionLeftModules as HomeContentBlock[]) ?? []).map((m, mi) => (
                                <details key={m.id} className="rounded border border-border bg-muted/30 group/mod">
                                  <summary className="flex cursor-pointer items-center justify-between px-2 py-2 list-none [&::-webkit-details-marker]:hidden">
                                    <span className="text-sm font-medium">{getBlockLabel(m.id, m.type as HomeBlockType, "pt")}</span>
                                    <div className="flex items-center gap-1">
                                      <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${m.config?.visible === false ? "text-muted-foreground" : "text-amber-500"}`} onClick={(e) => { e.preventDefault(); updateSectionModuleConfig(index, "left", mi, "visible", m.config?.visible === false); }} title={m.config?.visible === false ? "Exibir" : "Ocultar"}>
                                        {m.config?.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </Button>
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.preventDefault(); removeModuleFromSection(index, "left", mi); }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </summary>
                                  <div className="border-t border-border px-2 py-3 space-y-2">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <div className="space-y-1"><Label className="text-xs">Título (PT)</Label><Input placeholder="Título da seção" value={(m.config?.titlePt as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "left", mi, "titlePt", e.target.value)} className="h-8" /></div>
                                      <div className="space-y-1"><Label className="text-xs">Título (EN)</Label><Input placeholder="Section title" value={(m.config?.titleEn as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "left", mi, "titleEn", e.target.value)} className="h-8" /></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs shrink-0">Cor de fundo:</Label>
                                      <input type="color" className="h-8 w-10 cursor-pointer rounded border" value={(m.config?.backgroundColor as string)?.trim() || "#18181b"} onChange={(e) => updateSectionModuleConfig(index, "left", mi, "backgroundColor", e.target.value)} />
                                      <Input placeholder="Vazio = transparente" className="h-8 flex-1 min-w-0" value={(m.config?.backgroundColor as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "left", mi, "backgroundColor", e.target.value)} />
                                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateSectionModuleConfig(index, "left", mi, "backgroundColor", "")}>Limpar</Button>
                                    </div>
                                    <ModuleTitleGradientFields
                                      compact
                                      forSectionColumnTitle
                                      gradientStart={(m.config?.titleGradientStart as string) ?? ""}
                                      gradientEnd={(m.config?.titleGradientEnd as string) ?? ""}
                                      onGradientStart={(v) => updateSectionModuleConfig(index, "left", mi, "titleGradientStart", v)}
                                      onGradientEnd={(v) => updateSectionModuleConfig(index, "left", mi, "titleGradientEnd", v)}
                                    />
                                    {m.type === "ultimos_resultados" && (
                                      <details className="rounded-lg border border-amber-500/40 bg-amber-500/10 mt-3">
                                        <summary className="cursor-pointer px-3 py-2 font-medium text-sm">Placares manuais</summary>
                                        <div className="border-t border-border px-3 py-3 space-y-3">
                                          {!page?.tenant?.slug ? (
                                            <p className="text-xs text-amber-600">Carregue a página primeiro.</p>
                                          ) : (
                                            <>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={loadingPastFixtures === m.id}
                                                onClick={async () => {
                                                  setLoadingPastFixtures(m.id);
                                                  try {
                                                    const list = await fetchFixtures(page!.tenant!.slug!);
                                                    const now = new Date();
                                                    const past = list.filter((f) => new Date(f.startISO) < now).sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime()).slice(0, 20);
                                                    setPastFixturesByBlock((prev) => ({ ...prev, [m.id]: past }));
                                                  } catch (err) {
                                                    console.error("Erro ao carregar jogos passados:", err);
                                                  } finally {
                                                    setLoadingPastFixtures(null);
                                                  }
                                                }}
                                              >
                                                {loadingPastFixtures === m.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarIcon className="h-4 w-4 mr-1" />}
                                                {loadingPastFixtures === m.id ? "Carregando…" : "Carregar jogos passados"}
                                              </Button>
                                              {(pastFixturesByBlock[m.id] ?? []).length > 0 && (
                                                <div className="space-y-2 mt-2">
                                                  {(pastFixturesByBlock[m.id] ?? []).map((f) => {
                                                    const resultados = (m.config?.resultadosManuais as Record<string, { homeScore: number; awayScore: number }>) ?? {};
                                                    const manual = resultados[f.externalId] ?? { homeScore: f.homeScore ?? 0, awayScore: f.awayScore ?? 0 };
                                                    return (
                                                      <div key={f.externalId} className="flex items-center gap-2 p-2 rounded border bg-background/50 text-sm">
                                                        <span className="min-w-0 truncate flex-1">{f.homeTeamName}</span>
                                                        <Input type="number" min={0} max={99} className="w-12 h-8 text-center" value={manual.homeScore} onChange={(e) => { const v = parseInt(e.target.value, 10); const next = { ...resultados, [f.externalId]: { ...manual, homeScore: Number.isNaN(v) ? 0 : v } }; updateSectionModuleConfig(index, "left", mi, "resultadosManuais", next); }} />
                                                        <span className="text-muted-foreground">×</span>
                                                        <Input type="number" min={0} max={99} className="w-12 h-8 text-center" value={manual.awayScore} onChange={(e) => { const v = parseInt(e.target.value, 10); const next = { ...resultados, [f.externalId]: { ...manual, awayScore: Number.isNaN(v) ? 0 : v } }; updateSectionModuleConfig(index, "left", mi, "resultadosManuais", next); }} />
                                                        <span className="min-w-0 truncate flex-1 text-right">{f.awayTeamName}</span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                </details>
                              ))}
                              <Select key={`section-${index}-left-${((block.config?.sectionLeftModules as HomeContentBlock[]) ?? []).length}`} value="" onValueChange={(v) => { if (v) addModuleToSection(index, "left", v as HomeBlockType); }}>
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="+ Adicionar módulo" /></SelectTrigger>
                                <SelectContent>
                                  {[
                                    ...(resolvedModuleCategory !== "geral"
                                      ? [
                                          <SelectGroup key="geral">
                                            <SelectLabel className="text-xs font-semibold text-muted-foreground">Geral</SelectLabel>
                                            {getMiddleModuleOptionsForCategory("geral").filter((o) => o.type !== "section").map((opt) => (
                                              <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                            ))}
                                          </SelectGroup>,
                                        ]
                                      : []),
                                    <SelectGroup key={moduleTypeFilter}>
                                      <SelectLabel className="text-xs font-semibold text-muted-foreground">{resolvedModuleLabel}</SelectLabel>
                                      {getMiddleModuleOptionsForCategory(resolvedModuleCategory).filter((o) => o.type !== "section").map((opt) => (
                                        <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectGroup>,
                                  ]}
                                </SelectContent>
                              </Select>
                            </div>
                          </details>
                          {((block.config?.sectionColumns as number) ?? 2) === 3 && (
                            <details className="rounded-lg border border-amber-500/40 bg-amber-500/10">
                              <summary className="cursor-pointer px-3 py-2 font-medium">
                                Coluna meio — {((block.config?.sectionMiddleModules as HomeContentBlock[]) ?? []).length} módulo(s)
                              </summary>
                              <div className="border-t border-border px-3 py-3 space-y-2">
                                <div className="grid gap-2 sm:grid-cols-2 pb-2 border-b border-border/50">
                                  <div className="space-y-1"><Label className="text-xs">Título da coluna (PT)</Label><Input placeholder="Ex: Destaques" value={(block.config?.sectionMiddleColumnTitlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionMiddleColumnTitlePt", e.target.value)} className="h-8" /></div>
                                  <div className="space-y-1"><Label className="text-xs">Título da coluna (EN)</Label><Input placeholder="Ex: Highlights" value={(block.config?.sectionMiddleColumnTitleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionMiddleColumnTitleEn", e.target.value)} className="h-8" /></div>
                                </div>
                                <div className="pb-2 border-b border-border/50 space-y-2">
                                  <Label className="text-xs">Fundo da coluna (cor ou imagem)</Label>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input type="color" className="h-8 w-10 cursor-pointer rounded border" value={((block.config?.sectionMiddleColumnBackgroundColor as string)?.trim()) || "#18181b"} onChange={(e) => updateBlockConfig(index, "sectionMiddleColumnBackgroundColor", e.target.value)} />
                                    <Input placeholder="Cor (hex) — vazio = transparente" className="h-8 flex-1 min-w-[140px]" value={(block.config?.sectionMiddleColumnBackgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionMiddleColumnBackgroundColor", e.target.value)} />
                                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateBlockConfig(index, "sectionMiddleColumnBackgroundColor", "")}>Limpar cor</Button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <MediaPicker sizeKey="section_bg" allowAllFolders value={(block.config?.sectionMiddleColumnBackgroundImage as string) ?? ""} onChange={(url) => updateBlockConfig(index, "sectionMiddleColumnBackgroundImage", url)} placeholder="Imagem de fundo" />
                                    <Input placeholder="Ou URL da imagem" className="h-8 flex-1 min-w-0" value={(block.config?.sectionMiddleColumnBackgroundImage as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionMiddleColumnBackgroundImage", e.target.value)} />
                                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateBlockConfig(index, "sectionMiddleColumnBackgroundImage", "")}>Limpar img</Button>
                                  </div>
                                  {(block.config?.sectionMiddleColumnBackgroundImage as string)?.trim() && (
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs shrink-0">Overlay (0–1):</Label>
                                      <Input type="number" min={0} max={1} step={0.1} className="h-8 w-20" placeholder="0.75" value={(block.config?.sectionMiddleColumnBackgroundOverlayOpacity as number) ?? ""} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "sectionMiddleColumnBackgroundOverlayOpacity", v === "" ? undefined : Number(v)); }} />
                                    </div>
                                  )}
                                </div>
                                {((block.config?.sectionMiddleModules as HomeContentBlock[]) ?? []).map((m, mi) => (
                                  <details key={m.id} className="rounded border border-border bg-muted/30 group/mod">
                                    <summary className="flex cursor-pointer items-center justify-between px-2 py-2 list-none [&::-webkit-details-marker]:hidden">
                                      <span className="text-sm font-medium">{getBlockLabel(m.id, m.type as HomeBlockType, "pt")}</span>
                                      <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${m.config?.visible === false ? "text-muted-foreground" : "text-amber-500"}`} onClick={(e) => { e.preventDefault(); updateSectionModuleConfig(index, "middle", mi, "visible", m.config?.visible === false); }} title={m.config?.visible === false ? "Exibir" : "Ocultar"}>
                                          {m.config?.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.preventDefault(); removeModuleFromSection(index, "middle", mi); }}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </summary>
                                    <div className="border-t border-border px-2 py-3 space-y-2">
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="space-y-1"><Label className="text-xs">Título (PT)</Label><Input placeholder="Título da seção" value={(m.config?.titlePt as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "middle", mi, "titlePt", e.target.value)} className="h-8" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Título (EN)</Label><Input placeholder="Section title" value={(m.config?.titleEn as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "middle", mi, "titleEn", e.target.value)} className="h-8" /></div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs shrink-0">Cor de fundo:</Label>
                                        <input type="color" className="h-8 w-10 cursor-pointer rounded border" value={(m.config?.backgroundColor as string)?.trim() || "#18181b"} onChange={(e) => updateSectionModuleConfig(index, "middle", mi, "backgroundColor", e.target.value)} />
                                        <Input placeholder="Vazio = transparente" className="h-8 flex-1 min-w-0" value={(m.config?.backgroundColor as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "middle", mi, "backgroundColor", e.target.value)} />
                                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateSectionModuleConfig(index, "middle", mi, "backgroundColor", "")}>Limpar</Button>
                                      </div>
                                      <ModuleTitleGradientFields
                                        compact
                                        forSectionColumnTitle
                                        gradientStart={(m.config?.titleGradientStart as string) ?? ""}
                                        gradientEnd={(m.config?.titleGradientEnd as string) ?? ""}
                                        onGradientStart={(v) => updateSectionModuleConfig(index, "middle", mi, "titleGradientStart", v)}
                                        onGradientEnd={(v) => updateSectionModuleConfig(index, "middle", mi, "titleGradientEnd", v)}
                                      />
                                    </div>
                                  </details>
                                ))}
                                <Select key={`section-${index}-middle-${((block.config?.sectionMiddleModules as HomeContentBlock[]) ?? []).length}`} value="" onValueChange={(v) => { if (v) addModuleToSection(index, "middle", v as HomeBlockType); }}>
                                  <SelectTrigger className="w-full mt-2"><SelectValue placeholder="+ Adicionar módulo" /></SelectTrigger>
                                  <SelectContent>
                                    {[
                                      ...(resolvedModuleCategory !== "geral" ? [
                                        <SelectGroup key="geral">
                                          <SelectLabel className="text-xs font-semibold text-muted-foreground">Geral</SelectLabel>
                                          {getMiddleModuleOptionsForCategory("geral").filter((o) => o.type !== "section").map((opt) => (
                                            <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                          ))}
                                        </SelectGroup>,
                                      ] : []),
                                      <SelectGroup key={moduleTypeFilter}>
                                        <SelectLabel className="text-xs font-semibold text-muted-foreground">{resolvedModuleLabel}</SelectLabel>
                                        {getMiddleModuleOptionsForCategory(resolvedModuleCategory).filter((o) => o.type !== "section").map((opt) => (
                                          <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectGroup>,
                                    ]}
                                  </SelectContent>
                                </Select>
                              </div>
                            </details>
                          )}
                          {((block.config?.sectionColumns as number) ?? 2) >= 2 && (
                            <details className="rounded-lg border border-amber-500/40 bg-amber-500/10">
                              <summary className="cursor-pointer px-3 py-2 font-medium">
                                Coluna direita — {((block.config?.sectionRightModules as HomeContentBlock[]) ?? []).length} módulo(s)
                              </summary>
                              <div className="border-t border-border px-3 py-3 space-y-2">
                                <div className="grid gap-2 sm:grid-cols-2 pb-2 border-b border-border/50">
                                  <div className="space-y-1"><Label className="text-xs">Título da coluna (PT)</Label><Input placeholder="Ex: Últimos resultados" value={(block.config?.sectionRightColumnTitlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionRightColumnTitlePt", e.target.value)} className="h-8" /></div>
                                  <div className="space-y-1"><Label className="text-xs">Título da coluna (EN)</Label><Input placeholder="Ex: Last results" value={(block.config?.sectionRightColumnTitleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionRightColumnTitleEn", e.target.value)} className="h-8" /></div>
                                </div>
                                <div className="pb-2 border-b border-border/50 space-y-2">
                                  <Label className="text-xs">Fundo da coluna (cor ou imagem)</Label>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input type="color" className="h-8 w-10 cursor-pointer rounded border" value={((block.config?.sectionRightColumnBackgroundColor as string)?.trim()) || "#18181b"} onChange={(e) => updateBlockConfig(index, "sectionRightColumnBackgroundColor", e.target.value)} />
                                    <Input placeholder="Cor (hex) — vazio = transparente" className="h-8 flex-1 min-w-[140px]" value={(block.config?.sectionRightColumnBackgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionRightColumnBackgroundColor", e.target.value)} />
                                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateBlockConfig(index, "sectionRightColumnBackgroundColor", "")}>Limpar cor</Button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <MediaPicker sizeKey="section_bg" allowAllFolders value={(block.config?.sectionRightColumnBackgroundImage as string) ?? ""} onChange={(url) => updateBlockConfig(index, "sectionRightColumnBackgroundImage", url)} placeholder="Imagem de fundo" />
                                    <Input placeholder="Ou URL da imagem" className="h-8 flex-1 min-w-0" value={(block.config?.sectionRightColumnBackgroundImage as string) ?? ""} onChange={(e) => updateBlockConfig(index, "sectionRightColumnBackgroundImage", e.target.value)} />
                                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateBlockConfig(index, "sectionRightColumnBackgroundImage", "")}>Limpar img</Button>
                                  </div>
                                  {(block.config?.sectionRightColumnBackgroundImage as string)?.trim() && (
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs shrink-0">Overlay (0–1):</Label>
                                      <Input type="number" min={0} max={1} step={0.1} className="h-8 w-20" placeholder="0.75" value={(block.config?.sectionRightColumnBackgroundOverlayOpacity as number) ?? ""} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "sectionRightColumnBackgroundOverlayOpacity", v === "" ? undefined : Number(v)); }} />
                                    </div>
                                  )}
                                </div>
                                {((block.config?.sectionRightModules as HomeContentBlock[]) ?? []).map((m, mi) => (
                                  <details key={m.id} className="rounded border border-border bg-muted/30 group/mod">
                                    <summary className="flex cursor-pointer items-center justify-between px-2 py-2 list-none [&::-webkit-details-marker]:hidden">
                                      <span className="text-sm font-medium">{getBlockLabel(m.id, m.type as HomeBlockType, "pt")}</span>
                                      <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${m.config?.visible === false ? "text-muted-foreground" : "text-amber-500"}`} onClick={(e) => { e.preventDefault(); updateSectionModuleConfig(index, "right", mi, "visible", m.config?.visible === false); }} title={m.config?.visible === false ? "Exibir" : "Ocultar"}>
                                          {m.config?.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.preventDefault(); removeModuleFromSection(index, "right", mi); }}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </summary>
                                    <div className="border-t border-border px-2 py-3 space-y-2">
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="space-y-1"><Label className="text-xs">Título (PT)</Label><Input placeholder="Título da seção" value={(m.config?.titlePt as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "right", mi, "titlePt", e.target.value)} className="h-8" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Título (EN)</Label><Input placeholder="Section title" value={(m.config?.titleEn as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "right", mi, "titleEn", e.target.value)} className="h-8" /></div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs shrink-0">Cor de fundo:</Label>
                                        <input type="color" className="h-8 w-10 cursor-pointer rounded border" value={(m.config?.backgroundColor as string)?.trim() || "#18181b"} onChange={(e) => updateSectionModuleConfig(index, "right", mi, "backgroundColor", e.target.value)} />
                                        <Input placeholder="Vazio = transparente" className="h-8 flex-1 min-w-0" value={(m.config?.backgroundColor as string) ?? ""} onChange={(e) => updateSectionModuleConfig(index, "right", mi, "backgroundColor", e.target.value)} />
                                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => updateSectionModuleConfig(index, "right", mi, "backgroundColor", "")}>Limpar</Button>
                                      </div>
                                      <ModuleTitleGradientFields
                                        compact
                                        forSectionColumnTitle
                                        gradientStart={(m.config?.titleGradientStart as string) ?? ""}
                                        gradientEnd={(m.config?.titleGradientEnd as string) ?? ""}
                                        onGradientStart={(v) => updateSectionModuleConfig(index, "right", mi, "titleGradientStart", v)}
                                        onGradientEnd={(v) => updateSectionModuleConfig(index, "right", mi, "titleGradientEnd", v)}
                                      />
                                      {m.type === "ultimos_resultados" && (
                                        <details className="rounded-lg border border-amber-500/40 bg-amber-500/10 mt-3">
                                          <summary className="cursor-pointer px-3 py-2 font-medium text-sm">Placares manuais</summary>
                                          <div className="border-t border-border px-3 py-3 space-y-3">
                                            {!page?.tenant?.slug ? (
                                              <p className="text-xs text-amber-600">Carregue a página primeiro.</p>
                                            ) : (
                                              <>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  disabled={loadingPastFixtures === m.id}
                                                  onClick={async () => {
                                                    setLoadingPastFixtures(m.id);
                                                    try {
                                                      const list = await fetchFixtures(page!.tenant!.slug!);
                                                      const now = new Date();
                                                      const past = list.filter((f) => new Date(f.startISO) < now).sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime()).slice(0, 20);
                                                      setPastFixturesByBlock((prev) => ({ ...prev, [m.id]: past }));
                                                    } catch (err) {
                                                      console.error("Erro ao carregar jogos passados:", err);
                                                    } finally {
                                                      setLoadingPastFixtures(null);
                                                    }
                                                  }}
                                                >
                                                  {loadingPastFixtures === m.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarIcon className="h-4 w-4 mr-1" />}
                                                  {loadingPastFixtures === m.id ? "Carregando…" : "Carregar jogos passados"}
                                                </Button>
                                                {(pastFixturesByBlock[m.id] ?? []).length > 0 && (
                                                  <div className="space-y-2 mt-2">
                                                    {(pastFixturesByBlock[m.id] ?? []).map((f) => {
                                                      const resultados = (m.config?.resultadosManuais as Record<string, { homeScore: number; awayScore: number }>) ?? {};
                                                      const manual = resultados[f.externalId] ?? { homeScore: f.homeScore ?? 0, awayScore: f.awayScore ?? 0 };
                                                      return (
                                                        <div key={f.externalId} className="flex items-center gap-2 p-2 rounded border bg-background/50 text-sm">
                                                          <span className="min-w-0 truncate flex-1">{f.homeTeamName}</span>
                                                          <Input type="number" min={0} max={99} className="w-12 h-8 text-center" value={manual.homeScore} onChange={(e) => { const v = parseInt(e.target.value, 10); const next = { ...resultados, [f.externalId]: { ...manual, homeScore: Number.isNaN(v) ? 0 : v } }; updateSectionModuleConfig(index, "right", mi, "resultadosManuais", next); }} />
                                                          <span className="text-muted-foreground">×</span>
                                                          <Input type="number" min={0} max={99} className="w-12 h-8 text-center" value={manual.awayScore} onChange={(e) => { const v = parseInt(e.target.value, 10); const next = { ...resultados, [f.externalId]: { ...manual, awayScore: Number.isNaN(v) ? 0 : v } }; updateSectionModuleConfig(index, "right", mi, "resultadosManuais", next); }} />
                                                          <span className="min-w-0 truncate flex-1 text-right">{f.awayTeamName}</span>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                  </details>
                                ))}
                                <Select key={`section-${index}-right-${((block.config?.sectionRightModules as HomeContentBlock[]) ?? []).length}`} value="" onValueChange={(v) => { if (v) addModuleToSection(index, "right", v as HomeBlockType); }}>
                                  <SelectTrigger className="w-full mt-2"><SelectValue placeholder="+ Adicionar módulo" /></SelectTrigger>
                                  <SelectContent>
                                    {[
                                      ...(resolvedModuleCategory !== "geral" ? [
                                        <SelectGroup key="geral">
                                          <SelectLabel className="text-xs font-semibold text-muted-foreground">Geral</SelectLabel>
                                          {getMiddleModuleOptionsForCategory("geral").filter((o) => o.type !== "section").map((opt) => (
                                            <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                          ))}
                                        </SelectGroup>,
                                      ] : []),
                                      <SelectGroup key={moduleTypeFilter}>
                                        <SelectLabel className="text-xs font-semibold text-muted-foreground">{resolvedModuleLabel}</SelectLabel>
                                        {getMiddleModuleOptionsForCategory(resolvedModuleCategory).filter((o) => o.type !== "section").map((opt) => (
                                          <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectGroup>,
                                    ]}
                                  </SelectContent>
                                </Select>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    )}
                    {block.type === "patrocinadores" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Patrocinadores</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Adicione os logos e links dos patrocinadores. Na página, os logos aparecem em grid com efeito grayscale que vira colorido no hover.
                            </p>
                            <div className="space-y-2">
                              <MediaPicker
                                label="Logo do título (opcional - substitui o texto do título)"
                                sizeKey="patrocinadores"
                                uploadFolderHint="patrocinadores"
                                value={(block.config?.patrocinadoresTitleLogo as string) ?? ""}
                                onChange={(url) => updateBlockConfigValue(index, "patrocinadoresTitleLogo", url)}
                                placeholder="Escolher logo para o título"
                              />
                            </div>
                            {((block.config?.patrocinadoresManualItems as Array<{ id?: string; name?: string; logoUrl?: string; link?: string }>) ?? []).map((item, pi) => (
                              <div key={item.id ?? pi} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                                    {item.logoUrl ? (
                                      <img src={getPublicImageUrl(item.logoUrl)} alt="" className="h-full w-full object-contain p-1" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                        <Plus className="h-6 w-6" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <MediaPicker
                                      label="Logo"
                                      sizeKey="patrocinadores"
                                      uploadFolderHint="patrocinadores"
                                      value={item.logoUrl ?? ""}
                                      onChange={(url) => {
                                        const arr = [...((block.config?.patrocinadoresManualItems as Array<{ id?: string; name?: string; logoUrl?: string; link?: string }>) ?? [])];
                                        if (!arr[pi]) arr[pi] = { logoUrl: "" };
                                        arr[pi] = { ...arr[pi], logoUrl: url };
                                        updateBlockConfigValue(index, "patrocinadoresManualItems", arr);
                                      }}
                                      placeholder="Logo do patrocinador"
                                    />
                                    <Input
                                      placeholder="Nome (opcional)"
                                      value={item.name ?? ""}
                                      onChange={(e) => {
                                        const arr = [...((block.config?.patrocinadoresManualItems as Array<{ id?: string; name?: string; logoUrl?: string; link?: string }>) ?? [])];
                                        if (!arr[pi]) arr[pi] = {};
                                        arr[pi] = { ...arr[pi], name: e.target.value };
                                        updateBlockConfigValue(index, "patrocinadoresManualItems", arr);
                                      }}
                                    />
                                    <Input
                                      placeholder="Link (site do patrocinador — opcional)"
                                      value={item.link ?? ""}
                                      onChange={(e) => {
                                        const arr = [...((block.config?.patrocinadoresManualItems as Array<{ id?: string; name?: string; logoUrl?: string; link?: string }>) ?? [])];
                                        if (!arr[pi]) arr[pi] = {};
                                        arr[pi] = { ...arr[pi], link: e.target.value };
                                        updateBlockConfigValue(index, "patrocinadoresManualItems", arr);
                                      }}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive"
                                    onClick={() => {
                                      const arr = ((block.config?.patrocinadoresManualItems as Array<unknown>) ?? []).filter((_, j) => j !== pi);
                                      updateBlockConfigValue(index, "patrocinadoresManualItems", arr);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const arr = [...((block.config?.patrocinadoresManualItems as Array<{ id?: string; name?: string; logoUrl?: string; link?: string }>) ?? []), { id: `p-${Date.now()}`, name: "", logoUrl: "", link: "" }];
                                updateBlockConfigValue(index, "patrocinadoresManualItems", arr);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Adicionar patrocinador
                            </Button>
                            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-border">
                              <div className="space-y-2">
                                <Label>Espaço no topo</Label>
                                <Select
                                  value={(block.config?.patrocinadoresPaddingTop as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "patrocinadoresPaddingTop", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Espaço embaixo</Label>
                                <Select
                                  value={(block.config?.patrocinadoresPaddingBottom as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "patrocinadoresPaddingBottom", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "times_categorias" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Times por Categorias</summary>
                          <div className="border-t border-border px-3 py-3 space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Os atletas vêm do cadastro (<strong>Futebol → Atletas</strong>), agrupados por clube/slug. Na página pública só aparecem os marcados como visíveis (olho).
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Use <strong>Sync da planilha</strong> em Futebol → Atletas para importar. Use o ícone de visibilidade em cada atleta para exibir ou ocultar na página do time.
                            </p>
                            {page?.tenant?.slug && (
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href="/dashboard/cadastros/jogadores"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Futebol → Atletas →
                                </Link>
                                <Link
                                  href={`/portfolio/${page.tenant.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Ver página pública →
                                </Link>
                              </div>
                            )}
                            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-border">
                              <div className="space-y-2">
                                <Label>Espaço no topo</Label>
                                <Select
                                  value={(block.config?.timesCategoriasPaddingTop as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "timesCategoriasPaddingTop", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Espaço embaixo</Label>
                                <Select
                                  value={(block.config?.timesCategoriasPaddingBottom as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "timesCategoriasPaddingBottom", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "galeria" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Galeria de fotos</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Fotos manuais (enviadas na pasta Galeria fotos clubes) entram primeiro. O restante pode vir do RSS (Instagram via rss.app).
                            </p>
                            <div className="space-y-2">
                              <Label>Fonte</Label>
                              <Select
                                value={(block.config?.galeriaDataSource as string) ?? "rss_com_manual"}
                                onValueChange={(v) => updateBlockConfigValue(index, "galeriaDataSource", v)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rss_com_manual">RSS + manual (manuais primeiro)</SelectItem>
                                  <SelectItem value="rss">Só RSS (Instagram)</SelectItem>
                                  <SelectItem value="manual">Só manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {((block.config?.galeriaDataSource as string) === "rss_com_manual" || (block.config?.galeriaDataSource as string) === "manual" || (block.config?.galeriaDataSource as string) === "rss") && (
                              <div className="space-y-2">
                                <Label>Fotos manuais (primeiras na galeria)</Label>
                                <p className="text-xs text-muted-foreground">
                                  Envie na Mídia → Galeria fotos clubes (clube atual). Depois selecione abaixo.
                                </p>
                                {((block.config?.galeriaManualItems as Array<{ imageUrl?: string; link?: string; title?: string }>) ?? []).map((item, gi) => (
                                  <div key={gi} className="rounded-lg border border-border p-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                                        {item.imageUrl ? (
                                          <img src={getPublicImageUrl(item.imageUrl)} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                            <Plus className="h-6 w-6" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-2">
                                        <MediaPicker
                                          label=""
                                          sizeKey="galeria_clubes"
                                          galeriaSlug={page?.tenant?.slug}
                                          uploadFolderHint="galeria_clubes"
                                          value={item.imageUrl ?? ""}
                                          onChange={(url) => {
                                            const arr = [...((block.config?.galeriaManualItems as Array<{ imageUrl?: string; link?: string; title?: string }>) ?? [])];
                                            if (!arr[gi]) arr[gi] = {};
                                            arr[gi] = { ...arr[gi], imageUrl: url };
                                            updateBlockConfigValue(index, "galeriaManualItems", arr);
                                          }}
                                          placeholder="Escolher foto (pasta do clube)"
                                        />
                                        <Input
                                          placeholder="Link (opcional — ex: Instagram)"
                                          value={item.link ?? ""}
                                          onChange={(e) => {
                                            const arr = [...((block.config?.galeriaManualItems as Array<{ imageUrl?: string; link?: string; title?: string }>) ?? [])];
                                            if (!arr[gi]) arr[gi] = {};
                                            arr[gi] = { ...arr[gi], link: e.target.value };
                                            updateBlockConfigValue(index, "galeriaManualItems", arr);
                                          }}
                                        />
                                        <Input
                                          placeholder="Legenda (opcional)"
                                          value={item.title ?? ""}
                                          onChange={(e) => {
                                            const arr = [...((block.config?.galeriaManualItems as Array<{ imageUrl?: string; link?: string; title?: string }>) ?? [])];
                                            if (!arr[gi]) arr[gi] = {};
                                            arr[gi] = { ...arr[gi], title: e.target.value };
                                            updateBlockConfigValue(index, "galeriaManualItems", arr);
                                          }}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => {
                                          const arr = ((block.config?.galeriaManualItems as Array<unknown>) ?? []).filter((_, j) => j !== gi);
                                          updateBlockConfigValue(index, "galeriaManualItems", arr);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const arr = [...((block.config?.galeriaManualItems as Array<{ imageUrl?: string; link?: string; title?: string }>) ?? []), { imageUrl: "", link: "", title: "" }];
                                    updateBlockConfigValue(index, "galeriaManualItems", arr);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Adicionar foto
                                </Button>
                              </div>
                            )}
                            {((block.config?.galeriaDataSource as string) === "rss_com_manual" || (block.config?.galeriaDataSource as string) === "rss") && (
                              <>
                                <div className="space-y-2">
                                  <Label>URL do feed RSS (Instagram)</Label>
                                  <Input
                                    placeholder="https://rss.app/feed/... (Instagram)"
                                    value={(block.config?.galeriaRssUrl as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "galeriaRssUrl", e.target.value)}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Crie em <a href="https://rss.app/rss-feed/create-instagram-rss-feed" target="_blank" rel="noopener noreferrer" className="underline text-primary">rss.app</a> — cole a URL do perfil do Instagram.
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Máx. fotos</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={(block.config?.galeriaMaxItems as number) ?? 10}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      updateBlockConfigValue(index, "galeriaMaxItems", Number.isNaN(v) ? 10 : Math.min(24, Math.max(1, v)));
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Espaço no topo</Label>
                                <Select
                                  value={(block.config?.galeriaPaddingTop as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "galeriaPaddingTop", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Espaço embaixo</Label>
                                <Select
                                  value={(block.config?.galeriaPaddingBottom as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "galeriaPaddingBottom", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "noticias" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Feed de notícias</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Use RSS para Google News, Instagram (via RSS.app) ou site do clube. Cole a URL do feed em RSS.
                            </p>
                            <div className="space-y-2">
                              <Label>Fonte</Label>
                              <Select
                                value={(block.config?.noticiasDataSource as string) ?? "rss"}
                                onValueChange={(v) => updateBlockConfigValue(index, "noticiasDataSource", v)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rss">RSS (feed externo — Google News, Instagram, site)</SelectItem>
                                  <SelectItem value="manual">Manual (lista editada)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(block.config?.noticiasDataSource as string) !== "manual" && (
                              <>
                                <div className="space-y-2">
                                  <Label>URL do feed RSS</Label>
                                  <Input
                                    placeholder="https://rss.app/feed/... ou https://..."
                                    value={(block.config?.noticiasRssUrl as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "noticiasRssUrl", e.target.value)}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Crie em <a href="https://rss.app" target="_blank" rel="noopener noreferrer" className="underline text-primary">rss.app</a> — Google News ou Instagram.
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Máx. itens</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={(block.config?.noticiasMaxItems as number) ?? 10}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      updateBlockConfigValue(index, "noticiasMaxItems", Number.isNaN(v) ? 10 : Math.min(20, Math.max(1, v)));
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            {(block.config?.noticiasDataSource as string) === "manual" && (
                              <div className="space-y-2">
                                <Label>Itens manuais</Label>
                                <p className="text-xs text-muted-foreground">
                                  Adicione notícias manualmente (título, link, resumo). Em breve.
                                </p>
                              </div>
                            )}
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Espaço no topo</Label>
                                <Select
                                  value={(block.config?.noticiasPaddingTop as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "noticiasPaddingTop", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Espaço embaixo</Label>
                                <Select
                                  value={(block.config?.noticiasPaddingBottom as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "noticiasPaddingBottom", v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimal">Mínimo</SelectItem>
                                    <SelectItem value="compact">Compacto</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "proximos_jogos" && (
                      <ProximosJogosModuleEditor
                        block={block}
                        updateBlockConfigValue={(key, value) => updateBlockConfigValue(index, key, value)}
                        setError={setError}
                        principalTeamName={tenantName}
                        publicSlug={page?.tenant?.slug ?? ""}
                        publicPreviewPath={page?.tenant?.slug ? `/portfolio/${page.tenant.slug}` : ""}
                        linkedTenantId={tenantId}
                        canSyncSheets={!!page?.tenant?.id && !!page?.tenant?.slug?.trim()}
                      />
                    )}
                    {block.type === "ultimos_resultados" && (
                      <UltimosResultadosModuleEditor
                        block={block}
                        updateBlockConfigValue={(key, value) => updateBlockConfigValue(index, key, value)}
                        publicSlug={page?.tenant?.slug ?? ""}
                        fixturesFetchContext="tenant"
                      />
                    )}
                    {block.type === "tabela" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Tabela Classificação</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Planilha configurada em <strong>Configurações → Integrações</strong>. Use o botão abaixo para importar.
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={syncingTabelaBlockIndex === index}
                              onClick={async () => {
                                if (!page?.tenant?.id) return;
                                updateBlockConfigValue(index, "tabelaDataSource", "google_sheets");
                                setSyncingTabelaBlockIndex(index);
                                try {
                                  const res = await authFetch("/api/integrations/sync", {
                                    method: "POST",
                                    credentials: "include",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      type: "tabela_classificacao",
                                      slug: page.tenant.slug ?? undefined,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && Array.isArray(data.rows)) {
                                    updateBlockConfigValue(index, "tabelaManualRows", data.rows);
                                  } else if (data.error) {
                                    alert(data.error);
                                  }
                                } catch (err) {
                                  alert("Erro ao importar. Verifique Configurações → Integrações.");
                                } finally {
                                  setSyncingTabelaBlockIndex(null);
                                }
                              }}
                            >
                              {syncingTabelaBlockIndex === index ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : null}
                              Atualizar com Google Sheets
                            </Button>
                            {((block.config?.tabelaManualRows as object[]) ?? []).length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {((block.config?.tabelaManualRows as object[]) ?? []).length} linhas importadas. Filtros por categoria e temporada aparecem na barra abaixo da tabela.
                              </p>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "hero" && (
                      <>
                        <HeroModuleEditor
                          block={block}
                          index={index}
                          updateBlockConfig={updateBlockConfig}
                          updateBlockConfigValue={updateBlockConfigValue}
                        />
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Subtítulo e descrição</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Subtítulo (PT)</Label>
                                <Input
                                  placeholder="Frase de posicionamento"
                                  value={(block.config?.subtitlePT as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "subtitlePT", e.target.value.trim() || undefined)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Subtitle (EN)</Label>
                                <Input
                                  placeholder="Positioning phrase"
                                  value={(block.config?.subtitleEN as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "subtitleEN", e.target.value.trim() || undefined)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Descrição (PT) — opcional</Label>
                                <textarea
                                  placeholder="Até 3 linhas"
                                  value={(block.config?.descriptionPT as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "descriptionPT", e.target.value.trim() || undefined)}
                                  rows={3}
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Description (EN) — optional</Label>
                                <textarea
                                  placeholder="Up to 3 lines"
                                  value={(block.config?.descriptionEN as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "descriptionEN", e.target.value.trim() || undefined)}
                                  rows={3}
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Ações (CTA)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-4">
                              <div className="space-y-2">
                                <Label>Botão primário</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input placeholder="Label (PT)" value={(block.config?.primaryCTA as { labelPT?: string })?.labelPT ?? ""} onChange={(e) => updateBlockConfigValue(index, "primaryCTA", { ...(block.config?.primaryCTA as object || {}), labelPT: e.target.value })} />
                                  <Input placeholder="Label (EN)" value={(block.config?.primaryCTA as { labelEN?: string })?.labelEN ?? ""} onChange={(e) => updateBlockConfigValue(index, "primaryCTA", { ...(block.config?.primaryCTA as object || {}), labelEN: e.target.value })} />
                                </div>
                                <Input placeholder="Link (href)" value={(block.config?.primaryCTA as { href?: string })?.href ?? ""} onChange={(e) => updateBlockConfigValue(index, "primaryCTA", { ...(block.config?.primaryCTA as object || {}), href: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label>Botão secundário (opcional)</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input placeholder="Label (PT)" value={(block.config?.secondaryCTA as { labelPT?: string })?.labelPT ?? ""} onChange={(e) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), labelPT: e.target.value })} />
                                  <Input placeholder="Label (EN)" value={(block.config?.secondaryCTA as { labelEN?: string })?.labelEN ?? ""} onChange={(e) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), labelEN: e.target.value })} />
                                </div>
                                <Input placeholder="Link (href)" value={(block.config?.secondaryCTA as { href?: string })?.href ?? ""} onChange={(e) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), href: e.target.value })} />
                                <Select value={(block.config?.secondaryCTA as { variant?: string })?.variant ?? "outline"} onValueChange={(v) => updateBlockConfigValue(index, "secondaryCTA", { ...(block.config?.secondaryCTA as object || {}), variant: v as "outline" | "ghost" })}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="outline">Outline</SelectItem>
                                    <SelectItem value="ghost">Ghost</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Cor de fundo (hex)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Cor de fundo da seção (hex)</Label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                    value={(block.config?.backgroundColor as string) || "#18181b"}
                                    onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                  />
                                  <Input
                                    placeholder="#18181b ou vazio"
                                    value={(block.config?.backgroundColor as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Fundo & Overlay</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Modo do overlay</Label>
                                <Select value={(block.config?.overlayMode as string) ?? "solid"} onValueChange={(v) => updateBlockConfig(index, "overlayMode", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="solid">Sólido</SelectItem>
                                    <SelectItem value="gradient-bottom">Gradiente (cima→baixo)</SelectItem>
                                    <SelectItem value="gradient-right">Gradiente (esq→dir)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Cor do overlay (hex)</Label>
                                <div className="flex gap-2">
                                  <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.overlayColor as string) || "#000000"} onChange={(e) => updateBlockConfig(index, "overlayColor", e.target.value)} />
                                  <Input placeholder="#000000" value={(block.config?.overlayColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "overlayColor", e.target.value)} />
                                </div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Layout & Estilo</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Alinhamento horizontal</Label>
                                  <Select value={(block.config?.contentAlign as string) ?? "center"} onValueChange={(v) => updateBlockConfig(index, "contentAlign", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Esquerda</SelectItem>
                                      <SelectItem value="center">Centro</SelectItem>
                                      <SelectItem value="right">Direita</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Alinhamento vertical</Label>
                                  <Select value={(block.config?.verticalAlign as string) ?? "center"} onValueChange={(v) => updateBlockConfig(index, "verticalAlign", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="top">Topo</SelectItem>
                                      <SelectItem value="center">Centro</SelectItem>
                                      <SelectItem value="bottom">Base</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Largura máxima do conteúdo</Label>
                                <Select value={(block.config?.maxContentWidth as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "maxContentWidth", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="narrow">Estreita</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="wide">Larga</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Tamanho do título</Label>
                                <Select value={(block.config?.titleSize as string) ?? "2xl"} onValueChange={(v) => updateBlockConfig(index, "titleSize", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="xl">XL</SelectItem>
                                    <SelectItem value="2xl">2XL</SelectItem>
                                    <SelectItem value="3xl">3XL</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Estilo do subtítulo</Label>
                                <Select value={(block.config?.subtitleStyle as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "subtitleStyle", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="uppercase">Uppercase</SelectItem>
                                    <SelectItem value="highlighted">Destaque (linha/cor)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Altura do Hero</Label>
                                <Select value={(block.config?.heroHeight as string) ?? "medium"} onValueChange={(v) => updateBlockConfig(index, "heroHeight", v)}>
                                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="screen">Tela inteira (100vh)</SelectItem>
                                    <SelectItem value="large">Grande (80vh)</SelectItem>
                                    <SelectItem value="medium">Médio (60vh)</SelectItem>
                                    <SelectItem value="compact">Compacto (50vh)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </details>
                        </>
                    )}
                    {block.type === "header" && (() => {
                      const preset = (block.config?.headerPreset as HeaderPreset) || "classic";
                      const applyPreset = (newPreset: HeaderPreset) => {
                        const list = [...blocks];
                        const bl = list[index];
                        if (!bl) return;
                        const merged = applyHeaderPresetOverwrite(newPreset, bl.config as Record<string, unknown>);
                        list[index] = { ...bl, config: merged };
                        setBlocks(list);
                      };
                      const bgMode = (block.config?.backgroundMode as string) ?? "—";
                      const bgColor = (block.config?.backgroundColor as string) ?? "—";
                      const linkStyleVal = (block.config?.linkStyle as string) ?? "—";
                      const stickyVal = !!block.config?.sticky;
                      return (
                        <>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Modelo do Cabeçalho</Label>
                            <Select
                              value={preset}
                              onValueChange={(v) => applyPreset(v as HeaderPreset)}
                            >
                              <SelectTrigger className="w-full max-w-md">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HEADER_PRESET_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="header-advanced"
                                checked={headerAdvanced}
                                onChange={(e) => setHeaderAdvanced(e.target.checked)}
                              />
                              <Label htmlFor="header-advanced" className="cursor-pointer">
                                Avançado
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="header-debug"
                                checked={headerDebug}
                                onChange={(e) => setHeaderDebug(e.target.checked)}
                              />
                              <Label htmlFor="header-debug" className="cursor-pointer">
                                Debug
                              </Label>
                            </div>
                          </div>
                          {headerDebug && (
                            <div className="sm:col-span-2 rounded border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-xs font-mono text-amber-200/90 space-y-1">
                              <div>Preset atual: <strong>{preset}</strong></div>
                              <div>bgMode: {String(bgMode)} · bgColor: {String(bgColor)} · linkStyle: {String(linkStyleVal)} · sticky: {String(stickyVal)}</div>
                            </div>
                          )}
                          {!headerAdvanced && (
                            <>
                              {(preset === "overlay" || preset === "minimal") && (
                                <div className="space-y-2 sm:col-span-2">
                                  <Label>Modo de fundo</Label>
                                  <Select
                                    value={(block.config?.backgroundMode as string) || "solid"}
                                    onValueChange={(v) => updateBlockConfigValue(index, "backgroundMode", v)}
                                  >
                                    <SelectTrigger className="w-full max-w-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="solid">Sólido</SelectItem>
                                      <SelectItem value="transparent">Transparente</SelectItem>
                                      <SelectItem value="blur">Blur</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {preset === "sticky" && (
                                <div className="flex items-center gap-2 sm:col-span-2">
                                  <input
                                    type="checkbox"
                                    checked={!!block.config?.sticky}
                                    onChange={(e) => updateBlockConfigValue(index, "sticky", e.target.checked)}
                                  />
                                  <Label>Fixo no topo ao scroll</Label>
                                </div>
                              )}
                              {(preset === "minimal" || preset === "centered") && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Tamanho do logo</Label>
                                    <Select
                                      value={(block.config?.logoSize as string) || "md"}
                                      onValueChange={(v) => updateBlockConfigValue(index, "logoSize", v)}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sm">Pequeno</SelectItem>
                                        <SelectItem value="md">Médio</SelectItem>
                                        <SelectItem value="lg">Grande</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Estilo dos links</Label>
                                    <Select
                                      value={(block.config?.linkStyle as string) || "text"}
                                      onValueChange={(v) => updateBlockConfigValue(index, "linkStyle", v)}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="pill">Pill</SelectItem>
                                        <SelectItem value="button">Botão</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </>
                              )}
                            </>
                          )}
                          {headerAdvanced && (
                            <div className="space-y-3 sm:col-span-2">
                              <details className="rounded-lg border border-border bg-muted/20">
                                <summary className="cursor-pointer px-3 py-2 font-medium">Layout</summary>
                                <div className="border-t border-border px-3 py-3 space-y-3">
                                  <div className="space-y-2">
                                    <Label>Tamanho do logo</Label>
                                    <Select
                                      value={(block.config?.logoSize as string) || "md"}
                                      onValueChange={(v) => updateBlockConfigValue(index, "logoSize", v)}
                                    >
                                      <SelectTrigger className="w-full max-w-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sm">Pequeno</SelectItem>
                                        <SelectItem value="md">Médio</SelectItem>
                                        <SelectItem value="lg">Grande</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Estilo dos links</Label>
                                    <Select
                                      value={(block.config?.linkStyle as string) || "text"}
                                      onValueChange={(v) => updateBlockConfigValue(index, "linkStyle", v)}
                                    >
                                      <SelectTrigger className="w-full max-w-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="pill">Pill</SelectItem>
                                        <SelectItem value="button">Botão</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="header-show-lang"
                                      checked={block.config?.showLanguage !== false}
                                      onChange={(e) => updateBlockConfigValue(index, "showLanguage", e.target.checked)}
                                    />
                                    <Label htmlFor="header-show-lang">Exibir idiomas (PT/EN)</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="header-show-home"
                                      checked={block.config?.showHomeLink !== false}
                                      onChange={(e) => updateBlockConfigValue(index, "showHomeLink", e.target.checked)}
                                    />
                                    <Label htmlFor="header-show-home">Exibir link Home</Label>
                                  </div>
                                </div>
                              </details>
                              <details className="rounded-lg border border-border bg-muted/20">
                                <summary className="cursor-pointer px-3 py-2 font-medium">Aparência</summary>
                                <div className="border-t border-border px-3 py-3 space-y-3">
                                  <div className="space-y-2">
                                    <Label>Modo de fundo</Label>
                                    <Select
                                      value={(block.config?.backgroundMode as string) || "solid"}
                                      onValueChange={(v) => updateBlockConfigValue(index, "backgroundMode", v)}
                                    >
                                      <SelectTrigger className="w-full max-w-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="solid">Sólido</SelectItem>
                                        <SelectItem value="transparent">Transparente</SelectItem>
                                        <SelectItem value="blur">Blur</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {(block.config?.backgroundMode as string) !== "transparent" && (block.config?.backgroundMode as string) !== "blur" && (
                                    <div className="space-y-2">
                                      <Label>Cor de fundo (hex)</Label>
                                      <div className="flex gap-2">
                                        <input
                                          type="color"
                                          className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                          value={(block.config?.backgroundColor as string) || "#18181b"}
                                          onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                        />
                                        <Input
                                          placeholder="#18181b"
                                          value={(block.config?.backgroundColor as string) ?? ""}
                                          onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>Cor do texto (hex)</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                        value={(block.config?.headerTextColor as string) || "#ffffff"}
                                        onChange={(e) => updateBlockConfig(index, "headerTextColor", e.target.value)}
                                      />
                                      <Input
                                        placeholder="#ffffff"
                                        value={(block.config?.headerTextColor as string) ?? ""}
                                        onChange={(e) => updateBlockConfig(index, "headerTextColor", e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Idioma selecionado (PT/EN) — fundo</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                        value={
                                          (() => {
                                            const v = (block.config?.headerLanguageSelectedBg as string)?.trim();
                                            if (v?.startsWith("#") && /^#[0-9A-Fa-f]{3,8}$/.test(v)) return v;
                                            return "#ffffff";
                                          })()
                                        }
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedBg", e.target.value)
                                        }
                                      />
                                      <Input
                                        placeholder="Ex: #ffffff ou rgba(255,255,255,0.2) — vazio = automático"
                                        value={(block.config?.headerLanguageSelectedBg as string) ?? ""}
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedBg", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Idioma selecionado (PT/EN) — texto</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                        value={(block.config?.headerLanguageSelectedText as string) || "#18181b"}
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedText", e.target.value)
                                        }
                                      />
                                      <Input
                                        placeholder="Ex: #18181b — vazio = automático"
                                        value={(block.config?.headerLanguageSelectedText as string) ?? ""}
                                        onChange={(e) =>
                                          updateBlockConfig(index, "headerLanguageSelectedText", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="header-border"
                                      checked={!!block.config?.borderBottom}
                                      onChange={(e) => updateBlockConfigValue(index, "borderBottom", e.target.checked)}
                                    />
                                    <Label htmlFor="header-border">Borda inferior</Label>
                                  </div>
                                  {block.config?.borderBottom && (
                                    <div className="space-y-2">
                                      <Label>Cor da borda (hex ou rgba)</Label>
                                      <div className="flex gap-2">
                                        <input
                                          type="color"
                                          className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                          value={
                                            (() => {
                                              const v = (block.config?.borderColor as string)?.trim();
                                              if (v?.startsWith("#") && /^#[0-9A-Fa-f]{3,8}$/.test(v))
                                                return v;
                                              if (v?.startsWith("rgba(")) {
                                                const m = v.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                                                if (m) {
                                                  const r = Number(m[1]).toString(16).padStart(2, "0");
                                                  const g = Number(m[2]).toString(16).padStart(2, "0");
                                                  const b = Number(m[3]).toString(16).padStart(2, "0");
                                                  return `#${r}${g}${b}`;
                                                }
                                              }
                                              return "#ffffff";
                                            })()
                                          }
                                          onChange={(e) =>
                                            updateBlockConfig(index, "borderColor", e.target.value)
                                          }
                                        />
                                        <Input
                                          placeholder="rgba(255,255,255,0.1) ou #ffffff"
                                          value={(block.config?.borderColor as string) ?? ""}
                                          onChange={(e) =>
                                            updateBlockConfig(index, "borderColor", e.target.value)
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {preset === "sticky" && (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={!!block.config?.sticky}
                                        onChange={(e) => updateBlockConfigValue(index, "sticky", e.target.checked)}
                                      />
                                      <Label>Fixo no topo (sticky)</Label>
                                    </div>
                                  )}
                                </div>
                              </details>
                              <details className="rounded-lg border border-border bg-muted/20">
                                <summary className="cursor-pointer px-3 py-2 font-medium">Links</summary>
                                <div className="border-t border-border px-3 py-3 space-y-2">
                                  <Label>Links do cabeçalho (label, href)</Label>
                                  {(Array.isArray(block.config?.headerLinks)
                                    ? block.config.headerLinks
                                    : []
                                  ).map((link: { label?: string; href?: string }, i: number) => (
                                    <div key={i} className="flex flex-wrap gap-2">
                                      <Input
                                        placeholder="Texto do link"
                                        className="flex-1 min-w-[120px]"
                                        value={link?.label ?? ""}
                                        onChange={(e) => {
                                          const arr = [...(block.config?.headerLinks ?? [])];
                                          arr[i] = { ...arr[i], label: e.target.value };
                                          updateBlockConfigValue(index, "headerLinks", arr);
                                        }}
                                      />
                                      <Input
                                        placeholder="#seção ou /url ou https://"
                                        className="flex-1 min-w-[120px]"
                                        value={link?.href ?? ""}
                                        onChange={(e) => {
                                          const arr = [...(block.config?.headerLinks ?? [])];
                                          arr[i] = { ...arr[i], href: e.target.value };
                                          updateBlockConfigValue(index, "headerLinks", arr);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => {
                                          const arr = (block.config?.headerLinks ?? []).filter((_: unknown, j: number) => j !== i);
                                          updateBlockConfigValue(index, "headerLinks", arr);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const arr = [...(block.config?.headerLinks ?? []), { label: "", href: "" }];
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar link
                                  </Button>
                                </div>
                              </details>
                            </div>
                          )}
                          {!headerAdvanced && (
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Links do cabeçalho (label, href)</Label>
                              {(Array.isArray(block.config?.headerLinks)
                                ? block.config.headerLinks
                                : []
                              ).map((link: { label?: string; href?: string }, i: number) => (
                                <div key={i} className="flex flex-wrap gap-2">
                                  <Input
                                    placeholder="Texto do link"
                                    className="flex-1 min-w-[120px]"
                                    value={link?.label ?? ""}
                                    onChange={(e) => {
                                      const arr = [...(block.config?.headerLinks ?? [])];
                                      arr[i] = { ...arr[i], label: e.target.value };
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  />
                                  <Input
                                    placeholder="#seção ou /url"
                                    className="flex-1 min-w-[120px]"
                                    value={link?.href ?? ""}
                                    onChange={(e) => {
                                      const arr = [...(block.config?.headerLinks ?? [])];
                                      arr[i] = { ...arr[i], href: e.target.value };
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive"
                                    onClick={() => {
                                      const arr = (block.config?.headerLinks ?? []).filter((_: unknown, j: number) => j !== i);
                                      updateBlockConfigValue(index, "headerLinks", arr);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const arr = [...(block.config?.headerLinks ?? []), { label: "", href: "" }];
                                  updateBlockConfigValue(index, "headerLinks", arr);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar link
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {block.type === "footer" && (
                      <>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Cor do texto e links (hex)</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                              value={(block.config?.footerTextColor as string) || "#71717a"}
                              onChange={(e) => updateBlockConfig(index, "footerTextColor", e.target.value)}
                            />
                            <Input
                              placeholder="#71717a ou vazio"
                              value={(block.config?.footerTextColor as string) ?? ""}
                              onChange={(e) => updateBlockConfig(index, "footerTextColor", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Texto do rodapé</Label>
                          <Input
                            placeholder="Ex: © 2025 Nome do grupo"
                            value={(block.config?.footerText as string) ?? ""}
                            onChange={(e) => updateBlockConfig(index, "footerText", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Links do rodapé (label, href)</Label>
                          {(Array.isArray(block.config?.footerLinks)
                            ? block.config.footerLinks
                            : []
                          ).map((link: { label?: string; href?: string }, i: number) => (
                            <div key={i} className="flex flex-wrap gap-2">
                              <Input
                                placeholder="Texto do link"
                                className="flex-1 min-w-[120px]"
                                value={link?.label ?? ""}
                                onChange={(e) => {
                                  const arr = [...(block.config?.footerLinks ?? [])];
                                  arr[i] = { ...arr[i], label: e.target.value };
                                  updateBlockConfigValue(index, "footerLinks", arr);
                                }}
                              />
                              <Input
                                placeholder="#seção ou /url"
                                className="flex-1 min-w-[120px]"
                                value={link?.href ?? ""}
                                onChange={(e) => {
                                  const arr = [...(block.config?.footerLinks ?? [])];
                                  arr[i] = { ...arr[i], href: e.target.value };
                                  updateBlockConfigValue(index, "footerLinks", arr);
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-destructive"
                                onClick={() => {
                                  const arr = (block.config?.footerLinks ?? []).filter((_: unknown, j: number) => j !== i);
                                  updateBlockConfigValue(index, "footerLinks", arr);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const arr = [...(block.config?.footerLinks ?? []), { label: "", href: "" }];
                                updateBlockConfigValue(index, "footerLinks", arr);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar link
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                    {block.type === "global_presence" && (() => {
                      const counters = mergeGlobalPresenceCounters(block.config?.counters as GlobalPresenceCounter[] | undefined);
                      const updateCounter = (i: number, field: keyof GlobalPresenceCounter, value: string | number | boolean) => {
                        const arr = [...counters];
                        arr[i] = { ...arr[i], [field]: value };
                        updateBlockConfigValue(index, "counters", arr);
                      };
                      return (
                        <div className="space-y-3 sm:col-span-2">
                          <details className="rounded-lg border border-border bg-muted/20">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Conteúdo (título, subtítulo, descrição)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><Label>Título (PT)</Label><Input placeholder="Presença Global" value={(block.config?.titlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)} /></div>
                                <div className="space-y-1"><Label>Título (EN)</Label><Input placeholder="Global Presence" value={(block.config?.titleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)} /></div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><Label>Subtítulo (PT)</Label><Input placeholder="Não somos locais. Somos plataforma." value={(block.config?.subtitlePT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "subtitlePT", e.target.value)} /></div>
                                <div className="space-y-1"><Label>Subtítulo (EN)</Label><Input placeholder="We are not local. We are a platform." value={(block.config?.subtitleEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "subtitleEN", e.target.value)} /></div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><Label>Descrição (PT) — opcional</Label><Input placeholder="1–2 linhas" value={(block.config?.descriptionPT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "descriptionPT", e.target.value)} /></div>
                                <div className="space-y-1"><Label>Description (EN) — optional</Label><Input placeholder="1–2 lines" value={(block.config?.descriptionEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "descriptionEN", e.target.value)} /></div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Aparência (FIFA)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1">
                                  <Label>Cor de fundo (hex)</Label>
                                  <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.backgroundColor as string) || "#0a0a0f"} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} />
                                    <Input placeholder="#0a0a0f" value={(block.config?.backgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label>Cor de destaque / pontos (hex)</Label>
                                  <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.accentColor as string) || "#38bdf8"} onChange={(e) => updateBlockConfig(index, "accentColor", e.target.value)} />
                                    <Input placeholder="#38bdf8" value={(block.config?.accentColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "accentColor", e.target.value)} />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label>Cor do mapa (mapTint hex)</Label>
                                  <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 cursor-pointer rounded border" value={(block.config?.mapTint as string) || "#334155"} onChange={(e) => updateBlockConfig(index, "mapTint", e.target.value)} />
                                    <Input placeholder="#334155" value={(block.config?.mapTint as string) ?? ""} onChange={(e) => updateBlockConfig(index, "mapTint", e.target.value)} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4">
                                <div className="space-y-1">
                                  <Label>Overlay (0–1)</Label>
                                  <Input type="number" min={0} max={1} step={0.1} className="w-20" value={(block.config?.overlayOpacity as number) ?? 0.4} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "overlayOpacity", v === "" ? undefined : Number(e.target.value)); }} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" id="gp-grid-t" checked={!!block.config?.showGridLines} onChange={(e) => updateBlockConfigValue(index, "showGridLines", e.target.checked)} />
                                  <Label htmlFor="gp-grid-t">Linhas de grid</Label>
                                </div>
                                <div className="space-y-1">
                                  <Label>Altura da seção</Label>
                                  <Select value={(block.config?.sectionHeight as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "sectionHeight", v)}>
                                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="compact">Compacto</SelectItem>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="tall">Alto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Contadores (Clubes, Empresas, Atletas, Projetos, Países)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              {counters.map((c, i) => (
                                <div key={c.key} className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!c.enabled} onChange={(e) => updateCounter(i, "enabled", e.target.checked)} />
                                    <Label className="font-mono text-xs">{c.key}</Label>
                                  </div>
                                  <Input placeholder="Label PT" className="w-28" value={c.labelPT ?? ""} onChange={(e) => updateCounter(i, "labelPT", e.target.value)} />
                                  <Input placeholder="Label EN" className="w-28" value={c.labelEN ?? ""} onChange={(e) => updateCounter(i, "labelEN", e.target.value)} />
                                  <Input type="number" min={0} className="w-20" value={c.value ?? 0} onChange={(e) => updateCounter(i, "value", parseInt(e.target.value, 10) || 0)} />
                                </div>
                              ))}
                            </div>
                          </details>
                          <p className="text-xs text-muted-foreground">
                            Clubes, Empresas e Países vêm do cadastro (empresas/clubes). Atletas e Projetos são manuais. O mapa e a lista &quot;Presença por país&quot; usam os dados de lat/lng do cadastro.
                          </p>
                        </div>
                      );
                    })()}
                    {block.type === "logo_carousel" && (
                      <div className="space-y-3 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Dados puxados automaticamente: clubes e empresas com logo em uma única faixa contínua.
                        </p>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Geral (faixa e cards)</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-1">
                              <Label>Cor de fundo da seção (hex)</Label>
                              <div className="flex gap-2">
                                <input type="color" className="h-10 w-12 cursor-pointer rounded border border-input bg-background shrink-0" value={(block.config?.backgroundColor as string)?.trim() || "#0f0f12"} onChange={(e) => updateBlockConfigValue(index, "backgroundColor", e.target.value)} />
                                <Input placeholder="#0f0f12" value={(block.config?.backgroundColor as string) ?? ""} onChange={(e) => updateBlockConfigValue(index, "backgroundColor", e.target.value)} className="flex-1" />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1">
                                <Label>Estilo do card</Label>
                                <Select value={(block.config?.logoCarouselCardStyle as string) ?? "fifa"} onValueChange={(v) => updateBlockConfigValue(index, "logoCarouselCardStyle", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fifa">FIFA (claro)</SelectItem>
                                    <SelectItem value="minimal">Minimal</SelectItem>
                                    <SelectItem value="glass">Glass (vidro)</SelectItem>
                                    <SelectItem value="dark">Escuro</SelectItem>
                                    <SelectItem value="bordered">Com borda</SelectItem>
                                    <SelectItem value="outline">Contorno (transparente)</SelectItem>
                                    <SelectItem value="gradient">Gradiente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Altura do card (px)</Label>
                                <Input type="number" min={80} max={400} value={(block.config?.logoCarouselCardHeight as number) ?? 260} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardHeight", parseInt(e.target.value, 10) || 260)} />
                              </div>
                              <div className="space-y-1">
                                <Label>Largura do card (× altura)</Label>
                                <Input type="number" min={1} max={3} step={0.2} placeholder="1.6" value={(block.config?.logoCarouselCardWidthRatio as number) ?? 1.6} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardWidthRatio", parseFloat(e.target.value) || 1.6)} />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1">
                                <Label>Cor dos cards (hex)</Label>
                                <div className="flex gap-2">
                                  <input type="color" className="h-10 w-12 cursor-pointer rounded border border-input bg-background shrink-0" value={(block.config?.logoCarouselCardBackground as string)?.trim() || "#FFFFFF"} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardBackground", e.target.value)} />
                                  <Input placeholder="#FFFFFF" value={(block.config?.logoCarouselCardBackground as string) ?? ""} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardBackground", e.target.value)} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>Raio do card (px)</Label>
                                <Input type="number" min={0} max={32} value={(block.config?.logoCarouselCardRadius as number) ?? 12} onChange={(e) => updateBlockConfigValue(index, "logoCarouselCardRadius", parseInt(e.target.value, 10) ?? 12)} />
                              </div>
                              <div className="space-y-1">
                                <Label>Espaço entre cards (px)</Label>
                                <Input type="number" min={0} max={48} value={(block.config?.logoCarouselGapBetweenCards as number) ?? 16} onChange={(e) => updateBlockConfigValue(index, "logoCarouselGapBetweenCards", parseInt(e.target.value, 10) ?? 16)} />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Espaço em cima (px)</Label>
                                <Input type="number" min={0} max={120} placeholder="24" value={(block.config?.logoCarouselPaddingTop as number) ?? 24} onChange={(e) => updateBlockConfigValue(index, "logoCarouselPaddingTop", e.target.value === "" ? undefined : parseInt(e.target.value, 10))} />
                              </div>
                              <div className="space-y-1">
                                <Label>Espaço em baixo (px)</Label>
                                <Input type="number" min={0} max={120} placeholder="24" value={(block.config?.logoCarouselPaddingBottom as number) ?? 24} onChange={(e) => updateBlockConfigValue(index, "logoCarouselPaddingBottom", e.target.value === "" ? undefined : parseInt(e.target.value, 10))} />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`lc-shadow-${block.id}`} checked={block.config?.logoCarouselShowShadow !== false} onChange={(e) => updateBlockConfigValue(index, "logoCarouselShowShadow", e.target.checked)} />
                                <Label htmlFor={`lc-shadow-${block.id}`}>Sombra no card</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`lc-pause-${block.id}`} checked={block.config?.logoCarouselPauseOnHover !== false} onChange={(e) => updateBlockConfigValue(index, "logoCarouselPauseOnHover", e.target.checked)} />
                                <Label htmlFor={`lc-pause-${block.id}`}>Pausar ao passar o mouse</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`lc-newtab-${block.id}`} checked={block.config?.logoCarouselOpenInNewTab !== false} onChange={(e) => updateBlockConfigValue(index, "logoCarouselOpenInNewTab", e.target.checked)} />
                                <Label htmlFor={`lc-newtab-${block.id}`}>Abrir link em nova aba</Label>
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Velocidade do carrossel</Label>
                                <Select value={(block.config?.logoCarouselAnimationSpeed as string) ?? "normal"} onValueChange={(v) => updateBlockConfigValue(index, "logoCarouselAnimationSpeed", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="slow">Lento</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="fast">Rápido</SelectItem>
                                    <SelectItem value="strobe-05">Strobe (espera 0,5 s)</SelectItem>
                                    <SelectItem value="strobe-1">Strobe (espera 1 s)</SelectItem>
                                    <SelectItem value="strobe-2">Strobe (espera 2 s)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Direção</Label>
                                <Select value={(block.config?.logoCarouselDirection as string) ?? "left-to-right"} onValueChange={(v) => updateBlockConfigValue(index, "logoCarouselDirection", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left-to-right">Esquerda → Direita</SelectItem>
                                    <SelectItem value="right-to-left">Direita → Esquerda</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "founder" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium flex items-center gap-2">
                            <User className="h-4 w-4" /> Perfil do Fundador
                          </summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="flex flex-col items-center gap-2">
                                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shrink-0">
                                  {(block.config?.founderPhoto as string)?.trim() ? (
                                    <img
                                      src={getPublicImageUrl(block.config?.founderPhoto as string)}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-10 w-10 text-muted-foreground" />
                                  )}
                                </div>
                                <MediaPicker
                                  label=""
                                  sizeKey="card"
                                  allowAllFolders
                                  value={(block.config?.founderPhoto as string) ?? ""}
                                  onChange={(url) => updateBlockConfig(index, "founderPhoto", url)}
                                  placeholder="Adicionar foto do fundador"
                                />
                              </div>
                              <div className="flex-1 min-w-[200px] space-y-2">
                                <div className="space-y-2">
                                  <Label>Cargo / função (PT)</Label>
                                  <Input
                                    placeholder="Ex: Fundador & Chairman"
                                    value={(block.config?.rolePT as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "rolePT", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Role (EN)</Label>
                                  <Input
                                    placeholder="e.g. Founder & Chairman"
                                    value={(block.config?.roleEN as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "roleEN", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Ano de fundação</Label>
                                  <Input
                                    placeholder="Ex: 2015"
                                    value={(block.config?.foundedYear as string) ?? ""}
                                    onChange={(e) => updateBlockConfig(index, "foundedYear", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Biografia</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-2">
                              <Label>Biografia (PT)</Label>
                              <textarea
                                placeholder="Texto longo em português. Parágrafos com quebra de linha preservada."
                                value={(block.config?.biographyPT as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "biographyPT", e.target.value)}
                                rows={6}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Biography (EN)</Label>
                              <textarea
                                placeholder="Long text in English. Paragraphs with line breaks preserved."
                                value={(block.config?.biographyEN as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "biographyEN", e.target.value)}
                                rows={6}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </details>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Destaque (citação)</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-2">
                              <Label>Frase de destaque (PT)</Label>
                              <Input
                                placeholder="Ex: lema ou frase em destaque"
                                value={(block.config?.highlightQuotePT as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "highlightQuotePT", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Highlight quote (EN)</Label>
                              <Input
                                placeholder="e.g. motto or highlight phrase"
                                value={(block.config?.highlightQuoteEN as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "highlightQuoteEN", e.target.value)}
                              />
                            </div>
                          </div>
                        </details>
                        <details className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Redes sociais</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</Label>
                              <Input
                                placeholder="https://linkedin.com/in/..."
                                value={(block.config?.socialLinkedIn as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialLinkedIn", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
                              <Input
                                placeholder="https://instagram.com/..."
                                value={(block.config?.socialInstagram as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialInstagram", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" /> Twitter / X</Label>
                              <Input
                                placeholder="https://x.com/..."
                                value={(block.config?.socialTwitter as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialTwitter", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Website pessoal</Label>
                              <Input
                                placeholder="https://..."
                                value={(block.config?.socialWebsite as string) ?? ""}
                                onChange={(e) => updateBlockConfig(index, "socialWebsite", e.target.value)}
                              />
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type !== "header" && block.type !== "footer" && block.type !== "hero" && (
                      <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                        <summary className="cursor-pointer px-3 py-2 font-medium">Conteúdo (textos e ícones)</summary>
                        <div className="border-t border-border px-3 py-3 space-y-4">
                          {block.type === "highlights" && (() => {
                            const pt = (Array.isArray(block.config?.highlightsPt) ? block.config.highlightsPt : ["", "", ""]).slice(0, 3);
                            const en = (Array.isArray(block.config?.highlightsEn) ? block.config.highlightsEn : ["", "", ""]).slice(0, 3);
                            const icons = (Array.isArray(block.config?.highlightsIcons) ? block.config.highlightsIcons : ["Trophy", "Globe", "Layers"]).slice(0, 3) as [string, string, string];
                            const HIGHLIGHTS_ICON_OPTIONS = [
                              { value: "Trophy", label: "Troféu" },
                              { value: "Globe", label: "Globo" },
                              { value: "Layers", label: "Camadas" },
                              { value: "Award", label: "Prêmio" },
                              { value: "Target", label: "Alvo" },
                              { value: "Zap", label: "Raio" },
                              { value: "Building2", label: "Prédio" },
                              { value: "Users", label: "Usuários" },
                              { value: "Star", label: "Estrela" },
                              { value: "BarChart3", label: "Gráfico" },
                              { value: "Briefcase", label: "Maleta" },
                            ];
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">Destaques — 3 cards (frases e ícone por card)</p>
                                {[0, 1, 2].map((i) => (
                                  <div key={i} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-1">
                                      <Label>Card {i + 1} — Frase (PT)</Label>
                                      <Input
                                        placeholder={`Frase ${i + 1} em português`}
                                        value={pt[i] ?? ""}
                                        onChange={(e) => {
                                          const arr = [...pt];
                                          arr[i] = e.target.value;
                                          updateBlockConfigValue(index, "highlightsPt", arr);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Card {i + 1} — Frase (EN)</Label>
                                      <Input
                                        placeholder={`Phrase ${i + 1} in English`}
                                        value={en[i] ?? ""}
                                        onChange={(e) => {
                                          const arr = [...en];
                                          arr[i] = e.target.value;
                                          updateBlockConfigValue(index, "highlightsEn", arr);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Card {i + 1} — Ícone</Label>
                                      <Select
                                        value={icons[i] ?? "Trophy"}
                                        onValueChange={(v) => {
                                          const arr = [...icons];
                                          arr[i] = v;
                                          updateBlockConfigValue(index, "highlightsIcons", arr);
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {HIGHLIGHTS_ICON_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          {block.type === "what" && (() => {
                            const cardsPt = (Array.isArray(block.config?.cardsPt) ? block.config.cardsPt : []).slice(0, 4);
                            const cardsEn = (Array.isArray(block.config?.cardsEn) ? block.config.cardsEn : []).slice(0, 4);
                            const ensure4 = (arr: Array<{ title?: string; body?: string }>) => {
                              const a = [...arr];
                              while (a.length < 4) a.push({ title: "", body: "" });
                              return a.slice(0, 4);
                            };
                            const pt = ensure4(cardsPt);
                            const en = ensure4(cardsEn);
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">O que fazemos — título, parágrafo, 4 cards e foto</p>
                                <div className="space-y-2">
                                  <Label>Parágrafo (PT) — abaixo do título</Label>
                                  <textarea placeholder="Texto descritivo em português" value={(block.config?.bodyPt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyPt", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Paragraph (EN)</Label>
                                  <textarea placeholder="Descriptive text in English" value={(block.config?.bodyEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyEn", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-3">
                                  <Label>4 cards (título + descrição em PT e EN)</Label>
                                  {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Card {i + 1}</p>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <Input placeholder="Título (PT)" value={pt[i]?.title ?? ""} onChange={(e) => { const arr = [...pt]; arr[i] = { ...arr[i], title: e.target.value }; updateBlockConfigValue(index, "cardsPt", arr); }} />
                                        <Input placeholder="Title (EN)" value={en[i]?.title ?? ""} onChange={(e) => { const arr = [...en]; arr[i] = { ...arr[i], title: e.target.value }; updateBlockConfigValue(index, "cardsEn", arr); }} />
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <Input placeholder="Descrição (PT)" value={pt[i]?.body ?? ""} onChange={(e) => { const arr = [...pt]; arr[i] = { ...arr[i], body: e.target.value }; updateBlockConfigValue(index, "cardsPt", arr); }} />
                                        <Input placeholder="Description (EN)" value={en[i]?.body ?? ""} onChange={(e) => { const arr = [...en]; arr[i] = { ...arr[i], body: e.target.value }; updateBlockConfigValue(index, "cardsEn", arr); }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <Label>Foto da seção (lado do texto)</Label>
                                  <MediaPicker sizeKey="section_bg" allowAllFolders value={(block.config?.imageUrl as string) ?? ""} onChange={(url) => updateBlockConfig(index, "imageUrl", url)} placeholder="Escolher da mídia" />
                                  <Input placeholder="Ou URL manual" value={(block.config?.imageUrl as string) ?? ""} onChange={(e) => updateBlockConfig(index, "imageUrl", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Posição da foto</Label>
                                  <Select value={(block.config?.whatImagePosition as string) ?? "right"} onValueChange={(v) => updateBlockConfig(index, "whatImagePosition", v)}>
                                    <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="right">Texto à esquerda, foto à direita</SelectItem>
                                      <SelectItem value="left">Foto à esquerda, texto à direita</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })()}
                          {block.type === "how" && (() => {
                            const bulletsPt = (Array.isArray(block.config?.bulletsPt) ? block.config.bulletsPt : []).slice(0, 4);
                            const bulletsEn = (Array.isArray(block.config?.bulletsEn) ? block.config.bulletsEn : []).slice(0, 4);
                            const ensure4 = (arr: string[]) => {
                              const a = [...arr];
                              while (a.length < 4) a.push("");
                              return a.slice(0, 4);
                            };
                            const pt = ensure4(bulletsPt);
                            const en = ensure4(bulletsEn);
                            const icons = (Array.isArray(block.config?.howBulletsIcons) ? block.config.howBulletsIcons : ["CheckCircle", "CheckCircle", "CheckCircle", "CheckCircle"]).slice(0, 4) as [string, string, string, string];
                            const HOW_ICON_OPTIONS = [
                              { value: "CheckCircle", label: "Check (círculo)" },
                              { value: "Check", label: "Check" },
                              { value: "Trophy", label: "Troféu" },
                              { value: "Globe", label: "Globo" },
                              { value: "Layers", label: "Camadas" },
                              { value: "Award", label: "Prêmio" },
                              { value: "Target", label: "Alvo" },
                              { value: "Zap", label: "Raio" },
                              { value: "Building2", label: "Prédio" },
                              { value: "Users", label: "Usuários" },
                              { value: "Star", label: "Estrela" },
                              { value: "BarChart3", label: "Gráfico" },
                              { value: "Briefcase", label: "Maleta" },
                            ];
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">Como funciona — título, subtítulo e 4 itens com ícone</p>
                                <div className="space-y-2">
                                  <Label>Subtítulo / parágrafo (PT) — abaixo do título</Label>
                                  <textarea placeholder="Texto em português" value={(block.config?.bodyPt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyPt", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Subtitle / paragraph (EN)</Label>
                                  <textarea placeholder="Text in English" value={(block.config?.bodyEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "bodyEn", e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-3">
                                  <Label>4 itens (texto em PT e EN + ícone)</Label>
                                  {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Item {i + 1}</p>
                                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                        <Input placeholder="Texto (PT)" value={pt[i] ?? ""} onChange={(e) => { const arr = [...pt]; arr[i] = e.target.value; updateBlockConfigValue(index, "bulletsPt", arr); }} />
                                        <Input placeholder="Text (EN)" value={en[i] ?? ""} onChange={(e) => { const arr = [...en]; arr[i] = e.target.value; updateBlockConfigValue(index, "bulletsEn", arr); }} />
                                        <div className="sm:col-span-2 lg:col-span-1">
                                          <Select value={icons[i] ?? "CheckCircle"} onValueChange={(v) => { const arr = [...icons]; arr[i] = v; updateBlockConfigValue(index, "howBulletsIcons", arr); }}>
                                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {HOW_ICON_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          {block.type === "cta" && (() => {
                            const cfg = block.config ?? {};
                            const buttons: CtaButtonConfig[] = Array.isArray(cfg.ctaButtons) ? cfg.ctaButtons.slice(0, 3) : [];
                            const applyPreset = (presetId: CtaPresetId) => {
                              const content = getCtaPresetContent(presetId);
                              if (!content) return;
                              const list = [...blocks];
                              const bl = list[index];
                              if (!bl?.config) return;
                              const c = { ...bl.config } as Record<string, unknown>;
                              if (!(c.titlePt as string)?.trim()) c.titlePt = content.titlePT;
                              if (!(c.titleEn as string)?.trim()) c.titleEn = content.titleEN;
                              if (!(c.ctaSubtitlePT as string)?.trim()) c.ctaSubtitlePT = content.subtitlePT;
                              if (!(c.ctaSubtitleEN as string)?.trim()) c.ctaSubtitleEN = content.subtitleEN;
                              if (!(c.ctaSupportTextPT as string)?.trim()) c.ctaSupportTextPT = content.supportPT;
                              if (!(c.ctaSupportTextEN as string)?.trim()) c.ctaSupportTextEN = content.supportEN;
                              if (!Array.isArray(c.ctaButtons) || (c.ctaButtons as CtaButtonConfig[]).length === 0) c.ctaButtons = content.buttons;
                              c.ctaPreset = presetId;
                              list[index] = { ...bl, config: c };
                              setBlocks(list);
                            };
                            return (
                              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground">CTA Final — conversão institucional (até 3 botões, sem contato direto)</p>
                                <div className="space-y-2">
                                  <Label>Preset (preenche só campos vazios)</Label>
                                  <Select value={(cfg.ctaPreset as string) ?? "custom"} onValueChange={(v) => { updateBlockConfig(index, "ctaPreset", v); if (v !== "custom") applyPreset(v as CtaPresetId); }}>
                                    <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {CTA_PRESET_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1"><Label>Título (PT)</Label><Input placeholder="Headline" value={(cfg.titlePt as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)} /></div>
                                  <div className="space-y-1"><Label>Título (EN)</Label><Input placeholder="Headline (EN)" value={(cfg.titleEn as string) ?? ""} onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)} /></div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1"><Label>Subtítulo (PT)</Label><Input placeholder="Subheadline" value={(cfg.ctaSubtitlePT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSubtitlePT", e.target.value)} /></div>
                                  <div className="space-y-1"><Label>Subtítulo (EN)</Label><Input placeholder="Subheadline (EN)" value={(cfg.ctaSubtitleEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSubtitleEN", e.target.value)} /></div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1"><Label>Texto de apoio (PT) — opcional</Label><Input placeholder="Frase curta" value={(cfg.ctaSupportTextPT as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSupportTextPT", e.target.value)} /></div>
                                  <div className="space-y-1"><Label>Texto de apoio (EN)</Label><Input placeholder="Short line" value={(cfg.ctaSupportTextEN as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaSupportTextEN", e.target.value)} /></div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Layout</Label>
                                  <div className="flex flex-wrap gap-4">
                                    <div><Label className="text-xs text-muted-foreground">CTA Layout</Label><Select value={(cfg.ctaLayout as string) ?? "centered"} onValueChange={(v) => updateBlockConfig(index, "ctaLayout", v)}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="centered">Centrado</SelectItem><SelectItem value="split">Split</SelectItem><SelectItem value="boxed">Boxed</SelectItem></SelectContent></Select></div>
                                    <div><Label className="text-xs text-muted-foreground">Alinhamento texto</Label><Select value={(cfg.ctaTextAlign as string) ?? "center"} onValueChange={(v) => updateBlockConfig(index, "ctaTextAlign", v)}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Esquerda</SelectItem><SelectItem value="center">Centro</SelectItem></SelectContent></Select></div>
                                    <div><Label className="text-xs text-muted-foreground">Largura</Label><Select value={(cfg.ctaContentWidth as string) ?? "normal"} onValueChange={(v) => updateBlockConfig(index, "ctaContentWidth", v)}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="wide">Larga</SelectItem></SelectContent></Select></div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Fundo</Label>
                                  <div className="flex flex-wrap gap-4">
                                    <div><Label className="text-xs text-muted-foreground">Tipo</Label><Select value={(cfg.ctaBackgroundMode as string) ?? "image"} onValueChange={(v) => updateBlockConfig(index, "ctaBackgroundMode", v)}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Imagem</SelectItem><SelectItem value="gradient">Gradiente</SelectItem><SelectItem value="solid">Cor sólida</SelectItem></SelectContent></Select></div>
                                    <div className="flex items-center gap-2"><input type="checkbox" id="cta-blur-t" checked={!!cfg.ctaBlur} onChange={(e) => updateBlockConfigValue(index, "ctaBlur", e.target.checked)} /><Label htmlFor="cta-blur-t">Blur</Label></div>
                                  </div>
                                  {(cfg.ctaBackgroundMode as string) === "image" && (
                                    <div className="space-y-1"><MediaPicker sizeKey="section_bg" allowAllFolders value={(cfg.backgroundImage as string) ?? ""} onChange={(url) => updateBlockConfig(index, "backgroundImage", url)} placeholder="Imagem de fundo" /><Input placeholder="Ou URL" value={(cfg.backgroundImage as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundImage", e.target.value)} /></div>
                                  )}
                                  {(cfg.ctaBackgroundMode as string) === "gradient" && (
                                    <div className="flex gap-2"><Input placeholder="Cor início (hex)" value={(cfg.ctaGradientStart as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaGradientStart", e.target.value)} /><Input placeholder="Cor fim (hex)" value={(cfg.ctaGradientEnd as string) ?? ""} onChange={(e) => updateBlockConfig(index, "ctaGradientEnd", e.target.value)} /></div>
                                  )}
                                  {(cfg.ctaBackgroundMode as string) === "solid" && (
                                    <div className="flex gap-2"><input type="color" className="h-10 w-12 rounded border" value={(cfg.backgroundColor as string) || "#18181b"} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} /><Input placeholder="Hex" value={(cfg.backgroundColor as string) ?? ""} onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)} /></div>
                                  )}
                                  <div className="flex gap-2 items-center"><Label className="text-xs text-muted-foreground">Overlay (0-1)</Label><Input type="number" min={0} max={1} step={0.1} placeholder="0.75" value={(cfg.ctaOverlayOpacity as number) ?? ""} onChange={(e) => { const v = e.target.value; updateBlockConfigValue(index, "ctaOverlayOpacity", v === "" ? undefined : Number(v)); }} className="w-20" /></div>
                                </div>
                                <div className="space-y-3">
                                  <Label>Botões (até 3 — links internos, âncoras ou externos; sem contato)</Label>
                                  {[0, 1, 2].map((i) => {
                                    const btn = buttons[i] ?? {};
                                    return (
                                      <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                        <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Label (PT)" value={btn.labelPT ?? ""} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], labelPT: e.target.value }; updateBlockConfigValue(index, "ctaButtons", arr); }} /><Input placeholder="Label (EN)" value={btn.labelEN ?? ""} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], labelEN: e.target.value }; updateBlockConfigValue(index, "ctaButtons", arr); }} /></div>
                                        <div className="flex flex-wrap gap-2">
                                          <Select value={(btn.type as string) ?? "primary"} onValueChange={(v) => { const arr = [...buttons]; arr[i] = { ...arr[i], type: v as "primary" | "secondary" | "ghost" }; updateBlockConfigValue(index, "ctaButtons", arr); }}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary</SelectItem><SelectItem value="ghost">Ghost</SelectItem></SelectContent></Select>
                                          <Input placeholder="URL ou #âncora" className="flex-1 min-w-[120px]" value={btn.href ?? ""} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], href: e.target.value }; updateBlockConfigValue(index, "ctaButtons", arr); }} />
                                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!btn.openInNewTab} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], openInNewTab: e.target.checked }; updateBlockConfigValue(index, "ctaButtons", arr); }} /> Nova aba</label>
                                          <label className="flex items-center gap-1"><input type="checkbox" checked={!!btn.highlighted} onChange={(e) => { const arr = [...buttons]; arr[i] = { ...arr[i], highlighted: e.target.checked }; updateBlockConfigValue(index, "ctaButtons", arr); }} /> Destaque</label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <Button type="button" variant="outline" size="sm" onClick={() => { const arr = [...buttons, { labelPT: "", labelEN: "", type: "secondary" as const, href: "" }].slice(0, 3); updateBlockConfigValue(index, "ctaButtons", arr); }} disabled={buttons.length >= 3}><Plus className="h-4 w-4 mr-1" /> Adicionar botão</Button>
                                </div>
                              </div>
                            );
                          })()}
                          {block.type !== "global_presence" && (
                          <>
                          <div className="space-y-2">
                            <Label>Título (PT)</Label>
                            <Input
                              placeholder="Título da seção em PT"
                              value={(block.config?.titlePt as string) ?? ""}
                              onChange={(e) =>
                                updateBlockConfig(index, "titlePt", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Título (EN)</Label>
                            <Input
                              placeholder="Section title (EN)"
                              value={(block.config?.titleEn as string) ?? ""}
                              onChange={(e) =>
                                updateBlockConfig(index, "titleEn", e.target.value)
                              }
                            />
                          </div>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2 font-medium">Cores do título (padrão do time)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <p className="text-xs text-muted-foreground">
                                Personalize o gradiente do título para seguir as cores do seu time. Deixe vazio para o padrão (âmbar/branco).
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Cor inicial (início do gradiente)</Label>
                                  <div className="flex gap-2">
                                    <input
                                      type="color"
                                      className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                      value={(block.config?.titleGradientStart as string) || "#fcd34d"}
                                      onChange={(e) => updateBlockConfig(index, "titleGradientStart", e.target.value)}
                                    />
                                    <Input
                                      placeholder="#fcd34d"
                                      value={(block.config?.titleGradientStart as string) ?? ""}
                                      onChange={(e) => updateBlockConfig(index, "titleGradientStart", e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Cor final (fim do gradiente)</Label>
                                  <div className="flex gap-2">
                                    <input
                                      type="color"
                                      className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                                      value={(block.config?.titleGradientEnd as string) || "#ffffff"}
                                      onChange={(e) => updateBlockConfig(index, "titleGradientEnd", e.target.value)}
                                    />
                                    <Input
                                      placeholder="#ffffff"
                                      value={(block.config?.titleGradientEnd as string) ?? ""}
                                      onChange={(e) => updateBlockConfig(index, "titleGradientEnd", e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </details>
                          </>
                          )}
                          {block.type !== "global_presence" && BLOCK_TYPES_WITH_BODY.includes(block.type as HomeBlockType) && (
                            <>
                              <div className="space-y-2">
                                <Label>Corpo (PT)</Label>
                                <Input
                                  placeholder="Texto da seção em PT"
                                  value={(block.config?.bodyPt as string) ?? ""}
                                  onChange={(e) =>
                                    updateBlockConfig(
                                      index,
                                      "bodyPt",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Body (EN)</Label>
                                <Input
                                  placeholder="Section body (EN)"
                                  value={(block.config?.bodyEn as string) ?? ""}
                                  onChange={(e) =>
                                    updateBlockConfig(
                                      index,
                                      "bodyEn",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </>
                          )}
                          {(block.type === "custom" || block.type === "galeria") && (
                            <div className="space-y-2">
                              <MediaPicker
                                label="Imagem da seção"
                                sizeKey="card"
                                allowAllFolders
                                value={(block.config?.imageUrl as string) ?? ""}
                                onChange={(url) => updateBlockConfig(index, "imageUrl", url)}
                                placeholder="Escolher da mídia (card)"
                              />
                              <Input
                                className="mt-1"
                                placeholder="Ou cole a URL manualmente"
                                value={(block.config?.imageUrl as string) ?? ""}
                                onChange={(e) =>
                                  updateBlockConfig(index, "imageUrl", e.target.value)
                                }
                              />
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                  )}
                </div>
                </div>
                </Fragment>
                );
              });
            })())}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
