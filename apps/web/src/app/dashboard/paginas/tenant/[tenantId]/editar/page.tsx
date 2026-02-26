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
  SelectItem,
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
  MODULE_OPTIONS,
  createBlock,
  BLOCK_TYPES_WITH_BODY,
  mergeGlobalPresenceCounters,
} from "@/lib/home-content";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
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

/** Garante: primeiro bloco = cabeçalho, último = rodapé, meio = módulos reordenáveis. */
function normalizeBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  const sorted = sortBlocks(blocks);
  const header = sorted.find((b) => b.type === "header") ?? createBlock("header", 0);
  const footer = sorted.find((b) => b.type === "footer") ?? createBlock("footer", 999);
  const middle = sorted.filter((b) => b.type !== "header" && b.type !== "footer");
  const list = [header, ...middle, footer];
  return list.map((b, i) => ({ ...b, sortOrder: i }));
}

/** Opções para adicionar só no meio (sem cabeçalho/rodapé no dropdown). */
const MIDDLE_MODULE_OPTIONS = MODULE_OPTIONS.filter(
  (o) => o.type !== "header" && o.type !== "footer",
);

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
  const [openFixtureByBlockId, setOpenFixtureByBlockId] = useState<Record<string, number>>({});
  const [syncingTimesCategoriasBlockIndex, setSyncingTimesCategoriasBlockIndex] = useState<number | null>(null);
  const [syncingProximosJogosBlockIndex, setSyncingProximosJogosBlockIndex] = useState<number | null>(null);
  const dateInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const proximosJogosUrlRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const proximosJogosGidRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const blocks = normalizeBlocks(page?.content?.blocks ?? []);

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
          setCollapsedBlockIds(new Set(normalized.map((b) => b.id)));
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

  const addModule = (type: HomeBlockType) => {
    if (type === "header" || type === "footer") return;
    const newBlock = createBlock(type, blocks.length - 1);
    const beforeFooter = blocks.slice(0, -1);
    setBlocks([...beforeFooter, newBlock, blocks[blocks.length - 1]!]);
    setCollapsedBlockIds((prev) => new Set(prev).add(newBlock.id));
  };

  const removeBlock = (index: number) => {
    if (index <= 0 || index >= blocks.length - 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const addModuleToSection = (
    sectionIndex: number,
    column: "left" | "right",
    type: HomeBlockType,
  ) => {
    if (type === "header" || type === "footer" || type === "section") return;
    const list = [...blocks];
    const block = list[sectionIndex];
    if (!block || block.type !== "section") return;
    const key = column === "left" ? "sectionLeftModules" : "sectionRightModules";
    const modules = ((block.config?.[key] as HomeContentBlock[]) ?? []) as HomeContentBlock[];
    const newBlock = createBlock(type, modules.length);
    const updated = [...modules, newBlock];
    const config = { ...(block.config ?? {}), [key]: updated };
    list[sectionIndex] = { ...block, config };
    setBlocks(list);
  };

  const removeModuleFromSection = (
    sectionIndex: number,
    column: "left" | "right",
    moduleIndex: number,
  ) => {
    const list = [...blocks];
    const block = list[sectionIndex];
    if (!block || block.type !== "section") return;
    const key = column === "left" ? "sectionLeftModules" : "sectionRightModules";
    const modules = ((block.config?.[key] as HomeContentBlock[]) ?? []) as HomeContentBlock[];
    const updated = modules.filter((_, i) => i !== moduleIndex);
    const config = { ...(block.config ?? {}), [key]: updated };
    list[sectionIndex] = { ...block, config };
    setBlocks(list);
  };

  const updateSectionModuleConfig = (
    sectionIndex: number,
    column: "left" | "right",
    moduleIndex: number,
    key: string,
    value: unknown,
  ) => {
    const list = [...blocks];
    const block = list[sectionIndex];
    if (!block || block.type !== "section") return;
    const configKey = column === "left" ? "sectionLeftModules" : "sectionRightModules";
    const modules = [...((block.config?.[configKey] as HomeContentBlock[]) ?? [])];
    const mod = modules[moduleIndex];
    if (!mod) return;
    modules[moduleIndex] = { ...mod, config: { ...(mod.config ?? {}), [key]: value } };
    const config = { ...(block.config ?? {}), [configKey]: modules };
    list[sectionIndex] = { ...block, config };
    setBlocks(list);
  };

  /** Normaliza blocos para o payload: heroSlides com url/titlePt/titleEn sempre strings (evita 403/413 por payload grande ou inconsistente). */
  const normalizeBlocksForSave = (list: HomeContentBlock[]): HomeContentBlock[] =>
    list.map((block) => {
      if (block.type !== "hero") return block;
      const slides = Array.isArray(block.config?.heroSlides) ? block.config.heroSlides : [];
      const normalizedSlides = slides.map((s: { url?: string; titlePt?: string; titleEn?: string }) => ({
        url: typeof s?.url === "string" ? s.url : "",
        titlePt: typeof s?.titlePt === "string" ? s.titlePt : "",
        titleEn: typeof s?.titleEn === "string" ? s.titleEn : "",
      }));
      return { ...block, config: { ...block.config, heroSlides: normalizedSlides } };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payloadBlocks = normalizeBlocksForSave(blocks);
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
        const msg = (data as { error?: string; message?: string })?.error ?? (data as { message?: string })?.message ?? "Erro ao salvar";
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

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Barra fixa: voltar, título e salvar — sempre visível ao rolar */}
      <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/paginas">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Editar página — {tenantName}</h1>
            <p className="text-xs text-muted-foreground">
              Módulos: Hero, Destaques, textos (PT/EN), aparência.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="max-w-[200px] truncate text-sm text-destructive" title={error}>
              {error}
            </span>
          )}
          {success && (
            <span className="text-sm text-green-600 dark:text-green-400">Salvo.</span>
          )}
          <Link href="/dashboard/paginas">
            <Button type="button" variant="outline" disabled={saving}>
              Voltar
            </Button>
          </Link>
          <Button type="submit" form="editor-tenant-page-form" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

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
        {/* Aparência geral da página — fundo, cores, fontes. Módulos podem sobrescrever. */}
        <Card className="border-violet-500/30 bg-violet-950/20">
          <CardHeader
            className="cursor-pointer select-none border-b border-transparent hover:border-violet-500/30 transition-colors"
            onClick={() => setGlobalAppearanceOpen((o) => !o)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-sm">Global</span>
                  Aparência geral da página
                </CardTitle>
                <CardDescription>
                  Fundo, cores, largura (box/full) e fontes aplicados a toda a página. Cada módulo pode sobrescrever em Aparência.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-violet-500/40"
                onClick={(e) => {
                  e.stopPropagation();
                  setGlobalAppearanceOpen((o) => !o);
                }}
                aria-expanded={globalAppearanceOpen}
                aria-label={globalAppearanceOpen ? "Recolher" : "Expandir"}
              >
                {globalAppearanceOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Expandir
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {globalAppearanceOpen && (
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
              <Label className="text-sm font-medium">Padrões (todos os módulos)</Label>
              <p className="text-xs text-muted-foreground">
                Defina aqui para não precisar configurar em cada módulo. Cada módulo pode sobrescrever em Aparência.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Largura do conteúdo</Label>
                  <Select
                    value={(theme.contentWidth as string) ?? "box"}
                    onValueChange={(v) => updateTheme("contentWidth", v as "box" | "full")}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box (centralizado)</SelectItem>
                      <SelectItem value="full">Full width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alinhamento dos títulos</Label>
                  <Select
                    value={(theme.titleAlign as string) ?? "left"}
                    onValueChange={(v) => updateTheme("titleAlign", v as "left" | "center" | "right")}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor de fundo do corpo (hex)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                    value={(theme.backgroundColor as string)?.trim() || "#0f0f12"}
                    onChange={(e) => updateTheme("backgroundColor", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#0f0f12"
                    className="flex-1 min-w-[120px]"
                    value={(theme.backgroundColor as string) ?? ""}
                    onChange={(e) => updateTheme("backgroundColor", e.target.value.trim() || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagem de fundo do corpo</Label>
                <MediaPicker
                  value={(theme.backgroundImage as string) ?? ""}
                  onChange={(url) => updateTheme("backgroundImage", url || undefined)}
                  sizeKey="backgrounds"
                  uploadFolderHint="backgrounds"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Opacidade do overlay sobre a imagem (0–1)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.75"
                  value={overlayOpacityDraft ?? String(theme.backgroundOverlayOpacity ?? "")}
                  onChange={(e) => setOverlayOpacityDraft(e.target.value)}
                  onBlur={() => {
                    const v = (overlayOpacityDraft ?? "").trim();
                    const n = v === "" ? undefined : parseFloat(v);
                    const valid = typeof n === "number" && !Number.isNaN(n) && n >= 0 && n <= 1;
                    updateTheme("backgroundOverlayOpacity", valid ? n : undefined);
                    setOverlayOpacityDraft(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do texto principal (hex)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                    value={(theme.textColor as string)?.trim() || "#fafafa"}
                    onChange={(e) => updateTheme("textColor", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#fafafa"
                    className="flex-1 min-w-[120px]"
                    value={(theme.textColor as string) ?? ""}
                    onChange={(e) => updateTheme("textColor", e.target.value.trim() || undefined)}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor de destaque / links (hex)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                    value={(theme.accentColor as string)?.trim() || "#fbbf24"}
                    onChange={(e) => updateTheme("accentColor", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#fbbf24"
                    className="flex-1 min-w-[120px]"
                    value={(theme.accentColor as string) ?? ""}
                    onChange={(e) => updateTheme("accentColor", e.target.value.trim() || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Família de fontes</Label>
                <Input
                  type="text"
                  placeholder="Inter, system-ui"
                  value={(theme.fontFamily as string) ?? ""}
                  onChange={(e) => updateTheme("fontFamily", e.target.value.trim() || undefined)}
                />
              </div>
            </div>
          </CardContent>
          )}
        </Card>

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
                const rows: Array<
                  | { type: "block"; block: HomeContentBlock; index: number; hidden: boolean }
                  | { type: "add" }
                > = [
                  ...(header ? [{ type: "block" as const, block: header, index: 0, hidden: false }] : []),
                  ...visibleMiddle.map(({ block, index }) => ({ type: "block" as const, block, index, hidden: false })),
                  { type: "add" },
                  ...hiddenMiddle.map(({ block, index }) => ({ type: "block" as const, block, index, hidden: true })),
                  ...(footer ? [{ type: "block" as const, block: footer, index: blocks.length - 1, hidden: false }] : []),
                ];
                return rows.map((row) => {
                  if (row.type === "add") {
                    return (
                      <div key="add-module" className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-red-500/50 bg-red-500/15 dark:bg-red-950/50 px-3 py-4">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Adicionar módulo:
                        </span>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) addModule(value as HomeBlockType);
                          }}
                        >
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Hero, Destaques, Texto…" />
                          </SelectTrigger>
                          <SelectContent>
                            {MIDDLE_MODULE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.type} value={opt.type}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  const { block, index, hidden } = row;
                  const isHeader = index === 0;
                  const isFooter = index === blocks.length - 1;
                  const isFixed = isHeader || isFooter;
                  const sectionLabel = isHeader
                    ? "Cabeçalho"
                    : isFooter
                      ? "Rodapé"
                      : `Módulo — ${getBlockLabel(block.id, block.type as HomeBlockType, "pt")}`;
                  const isExpanded = !collapsedBlockIds.has(block.id);
                  const cardClassName = isHeader || isFooter
                    ? `module-card flex flex-col gap-3 rounded-lg border-2 border-emerald-500/50 bg-emerald-950/30 p-3 overflow-hidden ${isExpanded ? "ring-2 ring-white/90" : ""}`
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
                  onDragEnter={!isFixed ? (e) => e.preventDefault() : undefined}
                  onDragOver={!isFixed ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  } : undefined}
                  onDrop={!isFixed ? (e) => {
                    e.preventDefault();
                    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                    if (Number.isNaN(from) || from === index) return;
                    moveBlockTo(from, index);
                  } : undefined}
                >
                  <div className="flex items-center gap-2">
                    {isFixed ? (
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Fixo
                      </span>
                    ) : (
                      <div
                        draggable
                        className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(index));
                          e.dataTransfer.effectAllowed = "move";
                          (e.currentTarget as HTMLElement).closest(".module-card")?.classList.add("opacity-60");
                        }}
                        onDragEnd={(e) => {
                          (e.currentTarget as HTMLElement).closest(".module-card")?.classList.remove("opacity-60");
                        }}
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        <span className="font-medium">
                          {sectionLabel}
                        </span>
                      </div>
                    )}
                    {isFixed ? (
                      <span className="font-medium">
                        {sectionLabel}
                      </span>
                    ) : null}
                    <div className="ml-auto flex items-center gap-1">
                      {!isFixed && (
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
                        className="h-8 w-8"
                        onClick={() => toggleBlockCollapsed(block.id)}
                        title={collapsedBlockIds.has(block.id) ? "Expandir módulo" : "Recolher módulo"}
                        aria-label={collapsedBlockIds.has(block.id) ? "Expandir módulo" : "Recolher módulo"}
                      >
                        {collapsedBlockIds.has(block.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBlock(index)}
                        disabled={isFixed}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!collapsedBlockIds.has(block.id) && (
                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">
                        Aparência (todos os módulos)
                      </Label>
                      {(block.type === "proximos_jogos" || block.type === "noticias" || block.type === "ultimos_resultados") && (
                        <p className="text-xs text-muted-foreground">
                          Deixe cor e imagem de fundo vazios para o fundo da página aparecer continuado (sem bloco separado).
                        </p>
                      )}
                    </div>
                    {(block.type !== "header" && block.type !== "footer") && (
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
                    {block.type !== "header" && block.type !== "footer" && (
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
                              <SelectItem value="compact">Compacto (menor)</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="large">Grande (mais espaço)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Compacto reduz o padding vertical; use para deixar o módulo menor e ganhar espaço na página.
                          </p>
                        </div>
                      </details>
                    )}
                    {block.type === "section" && (
                      <div className="space-y-4 sm:col-span-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Colunas</Label>
                            <Select
                              value={String((block.config?.sectionColumns as number) ?? 2)}
                              onValueChange={(v) => updateBlockConfigValue(index, "sectionColumns", v === "1" ? 1 : 2)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 coluna (empilhado)</SelectItem>
                                <SelectItem value="2">2 colunas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(block.config?.sectionColumns as number) === 2 && (
                            <div className="space-y-2">
                              <Label>Proporção das colunas</Label>
                              <Select
                                value={(block.config?.sectionLayout as string) ?? "50-50"}
                                onValueChange={(v) => updateBlockConfigValue(index, "sectionLayout", v)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="50-50">50% / 50%</SelectItem>
                                  <SelectItem value="33-66">33% / 66%</SelectItem>
                                  <SelectItem value="66-33">66% / 33%</SelectItem>
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
                        <div className={`grid gap-4 ${(block.config?.sectionColumns as number) === 2 ? "sm:grid-cols-2" : ""}`}>
                          <details open className="rounded-lg border border-amber-500/40 bg-amber-500/10">
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
                                  {MIDDLE_MODULE_OPTIONS.filter((o) => o.type !== "section").map((opt) => (
                                    <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </details>
                          {(block.config?.sectionColumns as number) === 2 && (
                            <details open className="rounded-lg border border-amber-500/40 bg-amber-500/10">
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
                                    {MIDDLE_MODULE_OPTIONS.filter((o) => o.type !== "section").map((opt) => (
                                      <SelectItem key={opt.type} value={opt.type}>{opt.label}</SelectItem>
                                    ))}
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
                        <details open className="rounded-lg border border-border bg-muted/20">
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
                        <details open className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Times por Categorias</summary>
                          <div className="border-t border-border px-3 py-3 space-y-4">
                            <p className="text-xs text-muted-foreground">
                              Adicione jogadores para cada categoria. O time atual será preenchido automaticamente com o nome do clube/empresa desta página.
                            </p>
                            <div className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
                              <p className="text-xs font-medium text-muted-foreground">Dados dinâmicos (Google Sheets)</p>
                              <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">URL ou ID da planilha</label>
                                  <input
                                    type="text"
                                    className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
                                    placeholder="https://docs.google.com/spreadsheets/d/... ou ID da planilha"
                                    value={((block.config?.timesCategoriasSpreadsheetUrl as string) ?? "").toString()}
                                    onChange={(e) => {
                                      const v = e.target.value || undefined;
                                      updateBlockConfigValue(index, "timesCategoriasSpreadsheetUrl", v);
                                      const gidMatch = typeof v === "string" && (v.match(/[?&]gid=(\d+)/i) || v.match(/#gid=(\d+)/i));
                                      if (gidMatch) {
                                        updateBlockConfigValue(index, "timesCategoriasSheetGid", gidMatch[1]);
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Aba (gid)</label>
                                    <input
                                      type="text"
                                      className="h-9 w-20 rounded border border-input bg-background px-2 text-sm"
                                      placeholder="0"
                                      value={((block.config?.timesCategoriasSheetGid as string) ?? "0").toString()}
                                      onChange={(e) => updateBlockConfigValue(index, "timesCategoriasSheetGid", e.target.value || "0")}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={syncingTimesCategoriasBlockIndex === index || !(block.config?.timesCategoriasSpreadsheetUrl as string)?.trim()}
                                    onClick={() => {
                                      const urlOrId = (block.config?.timesCategoriasSpreadsheetUrl as string)?.trim();
                                      const gid = ((block.config?.timesCategoriasSheetGid as string) ?? "0").toString().trim() || "0";
                                      const tenantName = page?.tenant?.name ?? "";
                                      if (!urlOrId) return;
                                      setSyncingTimesCategoriasBlockIndex(index);
                                      const params = new URLSearchParams({
                                        spreadsheetId: urlOrId,
                                        gid,
                                        ...(tenantName ? { tenantName } : {}),
                                      });
                                      authFetch(`/api/google-sheets/times-categorias?${params}`, { credentials: "include" })
                                        .then((r) => {
                                          if (!r.ok) return r.json().then((d) => Promise.reject(new Error((d as { error?: string })?.error ?? "Erro ao importar")));
                                          return r.json();
                                        })
                                        .then((data: { categories?: Array<{ id: string; namePT?: string; nameEN?: string; players?: unknown[] }> }) => {
                                          setError(null);
                                          if (data.categories?.length) {
                                            updateBlockConfigValue(index, "timesCategoriasCategories", data.categories);
                                          }
                                        })
                                        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao importar da planilha"))
                                        .finally(() => setSyncingTimesCategoriasBlockIndex(null));
                                    }}
                                  >
                                    {syncingTimesCategoriasBlockIndex === index ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Atualizar com Google Sheets"
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p className="font-medium">Opções (cole no campo acima):</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                  <li><strong>Link &quot;Publicado na Web&quot;</strong> — Arquivo &gt; Compartilhar &gt; Publicar na Web &gt; escolha a aba (ex. times-categorias-template) &gt; Formato: CSV &gt; copie o link gerado e cole aqui (o campo Aba pode ficar 0).</li>
                                  <li><strong>URL normal da planilha</strong> — Link de edição (docs.google.com/spreadsheets/d/.../edit). Compartilhar &gt; Qualquer pessoa com o link pode ver. Se der erro, use a opção &quot;Publicar na Web&quot; acima.</li>
                                  <li><strong>ID da planilha</strong> — Só o ID (~44 caracteres) e o gid da aba desejada.</li>
                                </ul>
                                <p>Primeira linha = cabeçalho com coluna <code className="rounded bg-muted px-1">categoria</code> (ou <code className="rounded bg-muted px-1">category</code>). Use <code className="rounded bg-muted px-1">pe_dominante</code> com: Esquerdo, Direito ou Ambos.{" "}
                                  <a href="/templates/times-categorias-template.csv" download="times-categorias-template.csv" className="text-primary underline hover:no-underline">
                                    Baixar template CSV
                                  </a>
                                  {" "}Na planilha você pode usar <strong>Dados → Validação de dados → Lista de itens</strong> para criar dropdowns em categoria, posição e pé dominante (guia em <code className="rounded bg-muted px-1">docs/DESENVOLVIMENTO_DIARIO.md (seção DOCS CONSOLIDADOS)</code>).
                                </p>
                              </div>
                            </div>
                            {FIXTURE_CATEGORIES.map((cat) => {
                              const categories = ((block.config?.timesCategoriasCategories as Array<{ id: string; namePT?: string; nameEN?: string; players?: Array<unknown> }>) ?? []);
                              let existingCategory = categories.find((c) => c.id === cat.value);
                              const players = existingCategory?.players ?? [];
                              const tenantName = page?.tenant?.name ?? "";

                              const updateCategoryPlayers = (newPlayers: Array<unknown>) => {
                                const prev = (block.config?.timesCategoriasCategories as unknown as Array<Record<string, unknown>>) ?? [];
                                const idx = prev.findIndex((c) => c.id === cat.value);
                                const nextCategories = prev.map((c, i) =>
                                  i === idx ? { ...c, players: newPlayers } : c
                                );
                                if (idx < 0) {
                                  nextCategories.push({
                                    id: cat.value,
                                    namePT: cat.labelPT,
                                    nameEN: cat.labelEN,
                                    players: newPlayers,
                                  });
                                }
                                updateBlockConfigValue(index, "timesCategoriasCategories", nextCategories);
                              };

                              const updatePlayerField = (pIdx: number, field: string, value: unknown) => {
                                const newPlayers = players.map((pl, i) => {
                                  if (i !== pIdx) return pl;
                                  const current = (pl as Record<string, unknown>) ?? {};
                                  return { ...current, [field]: value };
                                });
                                if (pIdx >= newPlayers.length) {
                                  newPlayers.push({
                                    id: `player-${Date.now()}`,
                                    name: "",
                                    currentTeam: tenantName,
                                    [field]: value,
                                  });
                                }
                                updateCategoryPlayers(newPlayers);
                              };

                              return (
                                <details key={cat.value} open={players.length > 0} className="rounded-lg border border-border bg-card">
                                  <summary className="cursor-pointer px-3 py-2 font-medium text-sm">
                                    {cat.labelPT} ({players.length} {players.length === 1 ? "jogador" : "jogadores"})
                                  </summary>
                                  <div className="border-t border-border px-3 py-3 space-y-3">
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium">Jogadores</Label>
                                      {players.map((player: unknown, pIdx: number) => {
                                      const p = player as {
                                        id?: string;
                                        name?: string;
                                        photoUrl?: string;
                                        birthDate?: string;
                                        nationality?: string;
                                        height?: number;
                                        weight?: number;
                                        preferredFoot?: string;
                                        jerseyNumber?: number;
                                        position?: string;
                                        fieldPosition?: { x?: number; y?: number };
                                        currentTeam?: string;
                                        previousTeams?: string[];
                                        seasonHistory?: Array<{
                                          id?: string;
                                          year?: number;
                                          team?: string;
                                          competition?: string;
                                          matches?: number;
                                          starts?: number;
                                          substitutions?: number;
                                          goals?: number;
                                          assists?: number;
                                          minutesPlayed?: number;
                                          yellowCards?: number;
                                          redCards?: number;
                                        }>;
                                        socialMedia?: {
                                          instagram?: string;
                                          twitter?: string;
                                          facebook?: string;
                                          tiktok?: string;
                                          youtube?: string;
                                          website?: string;
                                        };
                                        matchesPlayed?: number;
                                        goals?: number;
                                        assists?: number;
                                        yellowCards?: number;
                                        redCards?: number;
                                        marketValue?: number;
                                        highlights?: string[];
                                        bioPT?: string;
                                        bioEN?: string;
                                      };
                                      const playerTitle = p.jerseyNumber && p.name 
                                        ? `${p.jerseyNumber} - ${p.name}`
                                        : p.name || `Jogador ${pIdx + 1}`;
                                      return (
                                        <details key={p.id ?? pIdx} className="rounded-lg border border-border bg-muted/30 p-3">
                                          <summary className="cursor-pointer text-sm font-medium">
                                            {playerTitle}
                                          </summary>
                                          <div className="mt-3 space-y-3">
                                            <div className="grid gap-2 sm:grid-cols-2">
                                              <Input
                                                placeholder="Nome completo *"
                                                value={p.name ?? ""}
                                                onChange={(e) => {
                                                  const newPlayers = [...players];
                                                  if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName };
                                                  (newPlayers[pIdx] as { name?: string }).name = e.target.value;
                                                  updateCategoryPlayers(newPlayers);
                                                }}
                                              />
                                              <div className="flex items-start gap-2">
                                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                                                  {p.photoUrl ? (
                                                    <img
                                                      src={getPublicImageUrl(p.photoUrl)}
                                                      alt={p.name || "Foto do jogador"}
                                                      className="h-full w-full object-cover"
                                                    />
                                                  ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                      <Plus className="h-6 w-6" />
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-2">
                                                  <MediaPicker
                                                    label="Foto do jogador"
                                                    sizeKey="jogadores"
                                                    value={p.photoUrl ?? ""}
                                                    onChange={(url) => updatePlayerField(pIdx, "photoUrl", url)}
                                                    placeholder="Escolher foto"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-3">
                                              <div className="flex gap-1">
                                                <Input
                                                  placeholder="Data de Nascimento - DD/MMM/YYYY"
                                                  value={p.birthDate ? formatDateToDDMMMYYYY(p.birthDate) : ""}
                                                  onChange={(e) => {
                                                    let value = e.target.value.toLowerCase();
                                                    // Remove tudo exceto números, barras e letras
                                                    value = value.replace(/[^0-9\/a-z]/g, "");
                                                    
                                                    // Formatação automática durante digitação
                                                    let formatted = "";
                                                    const parts = value.split("/");
                                                    
                                                    if (parts[0]) {
                                                      // Dia (máximo 2 dígitos)
                                                      formatted = parts[0].slice(0, 2);
                                                      if (parts[1]) {
                                                        // Mês (máximo 3 letras)
                                                        const monthPart = parts[1].slice(0, 3);
                                                        // Verifica se é um mês válido
                                                        const validMonth = MONTHS_ABBR.find(m => m.startsWith(monthPart));
                                                        if (validMonth) {
                                                          formatted += "/" + validMonth;
                                                        } else if (monthPart.length > 0) {
                                                          formatted += "/" + monthPart;
                                                        }
                                                        if (parts[2]) {
                                                          // Ano (máximo 4 dígitos)
                                                          formatted += "/" + parts[2].slice(0, 4);
                                                        }
                                                      }
                                                    }
                                                    
                                                    // Se está completo (dd/mmm/yyyy), converte e salva
                                                    if (formatted.match(/^\d{1,2}\/[a-z]{3}\/\d{4}$/)) {
                                                      const dateValue = parseDDMMMYYYYToDate(formatted);
                                                      if (dateValue && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                                        updatePlayerField(pIdx, "birthDate", dateValue);
                                                      } else {
                                                        updatePlayerField(pIdx, "birthDate", formatted);
                                                      }
                                                    } else {
                                                      // Salva formato parcial durante digitação
                                                      updatePlayerField(pIdx, "birthDate", formatted);
                                                    }
                                                  }}
                                                  maxLength={12}
                                                />
                                                <input
                                                  type="date"
                                                  data-player-idx={pIdx}
                                                  ref={(el) => {
                                                    if (el) {
                                                      (dateInputRefs.current as Record<number, HTMLInputElement | null>)[pIdx] = el;
                                                    }
                                                  }}
                                                  className="hidden"
                                                  max={new Date().toISOString().split('T')[0]}
                                                  value={p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) ? p.birthDate : ""}
                                                  onChange={(e) => {
                                                    const dateValue = e.target.value || undefined;
                                                    updatePlayerField(pIdx, "birthDate", dateValue);
                                                  }}
                                                />
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="icon"
                                                  className="h-10 w-10 shrink-0"
                                                  title="Abrir calendário"
                                                  onClick={() => {
                                                    const input = (dateInputRefs.current as Record<number, HTMLInputElement | null>)[pIdx];
                                                    input?.showPicker?.();
                                                  }}
                                                >
                                                  <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                              </div>
                                              <Input
                                                placeholder="Nacionalidade"
                                                value={p.nationality ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "nationality", e.target.value)}
                                              />
                                              <Input
                                                type="number"
                                                placeholder="Número da camisa"
                                                value={p.jerseyNumber ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "jerseyNumber", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-3">
                                              <Input
                                                type="number"
                                                placeholder="Altura (cm)"
                                                value={p.height ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "height", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                              <Input
                                                type="number"
                                                placeholder="Peso (kg)"
                                                value={p.weight ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "weight", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                              <Select
                                                value={p.preferredFoot ?? ""}
                                                onValueChange={(v) => updatePlayerField(pIdx, "preferredFoot", v || undefined)}
                                              >
                                                <SelectTrigger><SelectValue placeholder="Pé predominante" /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="left">Esquerdo</SelectItem>
                                                  <SelectItem value="right">Direito</SelectItem>
                                                  <SelectItem value="both">Ambos</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                              <Select
                                                value={p.position ?? ""}
                                                onValueChange={(v) => updatePlayerField(pIdx, "position", v || undefined)}
                                              >
                                                <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                                                <SelectContent>
                                                  {FOOTBALL_POSITIONS.map((pos) => (
                                                    <SelectItem key={pos.value} value={pos.value}>
                                                      {pos.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Input
                                                placeholder="Time atual"
                                                value={p.currentTeam ?? tenantName}
                                                onChange={(e) => {
                                                  const newPlayers = [...players];
                                                  if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName };
                                                  (newPlayers[pIdx] as { currentTeam?: string }).currentTeam = e.target.value || tenantName;
                                                  updateCategoryPlayers(newPlayers);
                                                }}
                                              />
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-4">
                                              <Input
                                                type="number"
                                                placeholder="Jogos"
                                                value={p.matchesPlayed ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "matchesPlayed", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                              <Input
                                                type="number"
                                                placeholder="Gols"
                                                value={p.goals ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "goals", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                              <Input
                                                type="number"
                                                placeholder="Assistências"
                                                value={p.assists ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "assists", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                              <Input
                                                type="number"
                                                placeholder="Valor mercado (€)"
                                                value={p.marketValue ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "marketValue", e.target.value ? Number(e.target.value) : undefined)}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-xs">Biografia (PT)</Label>
                                              <textarea
                                                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="Biografia do jogador em português"
                                                value={p.bioPT ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "bioPT", e.target.value)}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-xs">Biografia (EN)</Label>
                                              <textarea
                                                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="Biografia do jogador em inglês"
                                                value={p.bioEN ?? ""}
                                                onChange={(e) => updatePlayerField(pIdx, "bioEN", e.target.value)}
                                              />
                                            </div>
                                            
                                            {/* Redes Sociais */}
                                            <div className="space-y-2">
                                              <Label className="text-xs font-medium">Redes Sociais</Label>
                                              <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="flex items-center gap-2">
                                                  <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
                                                  <Input
                                                    placeholder="Instagram (@usuario ou URL)"
                                                    value={p.socialMedia?.instagram ?? ""}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, socialMedia: {} };
                                                      const socialMedia = ((newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia ?? {});
                                                      socialMedia.instagram = e.target.value;
                                                      (newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia = socialMedia;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Twitter className="h-4 w-4 text-muted-foreground shrink-0" />
                                                  <Input
                                                    placeholder="Twitter/X (@usuario ou URL)"
                                                    value={p.socialMedia?.twitter ?? ""}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, socialMedia: {} };
                                                      const socialMedia = ((newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia ?? {});
                                                      socialMedia.twitter = e.target.value;
                                                      (newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia = socialMedia;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Facebook className="h-4 w-4 text-muted-foreground shrink-0" />
                                                  <Input
                                                    placeholder="Facebook (URL)"
                                                    value={p.socialMedia?.facebook ?? ""}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, socialMedia: {} };
                                                      const socialMedia = ((newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia ?? {});
                                                      socialMedia.facebook = e.target.value;
                                                      (newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia = socialMedia;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                                                  <Input
                                                    placeholder="TikTok (@usuario ou URL)"
                                                    value={p.socialMedia?.tiktok ?? ""}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, socialMedia: {} };
                                                      const socialMedia = ((newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia ?? {});
                                                      socialMedia.tiktok = e.target.value;
                                                      (newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia = socialMedia;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Youtube className="h-4 w-4 text-muted-foreground shrink-0" />
                                                  <Input
                                                    placeholder="YouTube (URL do canal)"
                                                    value={p.socialMedia?.youtube ?? ""}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, socialMedia: {} };
                                                      const socialMedia = ((newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia ?? {});
                                                      socialMedia.youtube = e.target.value;
                                                      (newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia = socialMedia;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                                  <Input
                                                    placeholder="Site pessoal (URL)"
                                                    value={p.socialMedia?.website ?? ""}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, socialMedia: {} };
                                                      const socialMedia = ((newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia ?? {});
                                                      socialMedia.website = e.target.value;
                                                      (newPlayers[pIdx] as { socialMedia?: Record<string, string> }).socialMedia = socialMedia;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Histórico de Temporadas */}
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium">Histórico de Temporadas</Label>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-7 text-xs"
                                                  onClick={() => {
                                                    const newPlayers = [...players];
                                                    if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                    const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                    history.push({
                                                      id: `season-${Date.now()}`,
                                                      year: new Date().getFullYear(),
                                                      team: "",
                                                      competition: "",
                                                    });
                                                    (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                    updateCategoryPlayers(newPlayers);
                                                  }}
                                                >
                                                  <Plus className="h-3 w-3 mr-1" /> Adicionar temporada
                                                </Button>
                                              </div>
                                              {((p.seasonHistory as Array<unknown>) ?? []).map((season: unknown, sIdx: number) => {
                                                const s = season as {
                                                  id?: string;
                                                  year?: number;
                                                  team?: string;
                                                  competition?: string;
                                                  matches?: number;
                                                  starts?: number;
                                                  substitutions?: number;
                                                  goals?: number;
                                                  assists?: number;
                                                  minutesPlayed?: number;
                                                  yellowCards?: number;
                                                  redCards?: number;
                                                };
                                                return (
                                                  <details key={s.id ?? sIdx} className="rounded-lg border border-border bg-muted/20 p-3">
                                                    <summary className="cursor-pointer text-xs font-medium">
                                                      {s.year && s.team && s.competition 
                                                        ? `${s.year} - ${s.team} - ${s.competition}`
                                                        : `Temporada ${sIdx + 1}`}
                                                    </summary>
                                                    <div className="mt-3 space-y-3 grid gap-2 sm:grid-cols-2">
                                                      <Input
                                                        type="number"
                                                        placeholder="Ano"
                                                        value={s.year ?? ""}
                                                        onChange={(e) => {
                                                          const newPlayers = [...players];
                                                          if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                          const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                          if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                          (history[sIdx] as { year?: number }).year = e.target.value ? Number(e.target.value) : undefined;
                                                          (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                          updateCategoryPlayers(newPlayers);
                                                        }}
                                                      />
                                                      <Input
                                                        placeholder="Time"
                                                        value={s.team ?? ""}
                                                        onChange={(e) => {
                                                          const newPlayers = [...players];
                                                          if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                          const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                          if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                          (history[sIdx] as { team?: string }).team = e.target.value;
                                                          (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                          updateCategoryPlayers(newPlayers);
                                                        }}
                                                      />
                                                      <Input
                                                        placeholder="Competição"
                                                        value={s.competition ?? ""}
                                                        onChange={(e) => {
                                                          const newPlayers = [...players];
                                                          if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                          const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                          if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                          (history[sIdx] as { competition?: string }).competition = e.target.value;
                                                          (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                          updateCategoryPlayers(newPlayers);
                                                        }}
                                                      />
                                                      <div className="grid gap-2 sm:grid-cols-3">
                                                        <Input
                                                          type="number"
                                                          placeholder="Partidas"
                                                          value={s.matches ?? ""}
                                                          onChange={(e) => {
                                                            const newPlayers = [...players];
                                                            if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                            const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                            if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                            (history[sIdx] as { matches?: number }).matches = e.target.value ? Number(e.target.value) : undefined;
                                                            (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                            updateCategoryPlayers(newPlayers);
                                                          }}
                                                        />
                                                        <Input
                                                          type="number"
                                                          placeholder="Início (titular)"
                                                          value={s.starts ?? ""}
                                                          onChange={(e) => {
                                                            const newPlayers = [...players];
                                                            if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                            const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                            if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                            (history[sIdx] as { starts?: number }).starts = e.target.value ? Number(e.target.value) : undefined;
                                                            (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                            updateCategoryPlayers(newPlayers);
                                                          }}
                                                        />
                                                        <Input
                                                          type="number"
                                                          placeholder="Substituições"
                                                          value={s.substitutions ?? ""}
                                                          onChange={(e) => {
                                                            const newPlayers = [...players];
                                                            if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                            const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                            if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                            (history[sIdx] as { substitutions?: number }).substitutions = e.target.value ? Number(e.target.value) : undefined;
                                                            (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                            updateCategoryPlayers(newPlayers);
                                                          }}
                                                        />
                                                      </div>
                                                      <div className="grid gap-2 sm:grid-cols-4">
                                                        <Input
                                                          type="number"
                                                          placeholder="Gols"
                                                          value={s.goals ?? ""}
                                                          onChange={(e) => {
                                                            const newPlayers = [...players];
                                                            if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                            const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                            if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                            (history[sIdx] as { goals?: number }).goals = e.target.value ? Number(e.target.value) : undefined;
                                                            (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                            updateCategoryPlayers(newPlayers);
                                                          }}
                                                        />
                                                        <Input
                                                          type="number"
                                                          placeholder="Assistências"
                                                          value={s.assists ?? ""}
                                                          onChange={(e) => {
                                                            const newPlayers = [...players];
                                                            if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                            const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                            if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                            (history[sIdx] as { assists?: number }).assists = e.target.value ? Number(e.target.value) : undefined;
                                                            (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                            updateCategoryPlayers(newPlayers);
                                                          }}
                                                        />
                                                        <Input
                                                          type="number"
                                                          placeholder="Tempo (minutos)"
                                                          value={s.minutesPlayed ?? ""}
                                                          onChange={(e) => {
                                                            const newPlayers = [...players];
                                                            if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                            const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                            if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                            (history[sIdx] as { minutesPlayed?: number }).minutesPlayed = e.target.value ? Number(e.target.value) : undefined;
                                                            (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                            updateCategoryPlayers(newPlayers);
                                                          }}
                                                        />
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                          <Input
                                                            type="number"
                                                            placeholder="Amarelo"
                                                            value={s.yellowCards ?? ""}
                                                            onChange={(e) => {
                                                              const newPlayers = [...players];
                                                              if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                              const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                              if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                              (history[sIdx] as { yellowCards?: number }).yellowCards = e.target.value ? Number(e.target.value) : undefined;
                                                              (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                              updateCategoryPlayers(newPlayers);
                                                            }}
                                                          />
                                                          <Input
                                                            type="number"
                                                            placeholder="Vermelho"
                                                            value={s.redCards ?? ""}
                                                            onChange={(e) => {
                                                              const newPlayers = [...players];
                                                              if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, seasonHistory: [] };
                                                              const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []);
                                                              if (!history[sIdx]) history[sIdx] = { id: `season-${Date.now()}` };
                                                              (history[sIdx] as { redCards?: number }).redCards = e.target.value ? Number(e.target.value) : undefined;
                                                              (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                              updateCategoryPlayers(newPlayers);
                                                            }}
                                                          />
                                                        </div>
                                                      </div>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full text-destructive"
                                                        onClick={() => {
                                                          const newPlayers = [...players];
                                                          if (!newPlayers[pIdx]) return;
                                                          const history = ((newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory ?? []).filter((_, i) => i !== sIdx);
                                                          (newPlayers[pIdx] as { seasonHistory?: Array<unknown> }).seasonHistory = history;
                                                          updateCategoryPlayers(newPlayers);
                                                        }}
                                                      >
                                                        <Trash2 className="h-4 w-4 mr-1" /> Remover temporada
                                                      </Button>
                                                    </div>
                                                  </details>
                                                );
                                              })}
                                            </div>

                                            {/* Posição no Campo */}
                                            <div className="space-y-2">
                                              <Label className="text-xs font-medium">Posição no Campo</Label>
                                              <div className="relative w-full max-w-md mx-auto aspect-[3/2] border-2 border-white/20 rounded-lg overflow-hidden bg-zinc-900">
                                                {/* Imagem real do campo de futebol */}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src="/campo-futebol.png"
                                                  alt="Campo de futebol"
                                                  className="absolute inset-0 w-full h-full object-cover"
                                                />
                                                
                                                {/* Marcador de posição - laranja com borda branca */}
                                                {p.fieldPosition && (
                                                  <div
                                                    className="absolute w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg z-10"
                                                    style={{
                                                      left: `${p.fieldPosition.x ?? 50}%`,
                                                      top: `${p.fieldPosition.y ?? 50}%`,
                                                      transform: 'translate(-50%, -50%)',
                                                    }}
                                                  />
                                                )}
                                                
                                                {/* Área clicável */}
                                                <button
                                                  type="button"
                                                  className="absolute inset-0 cursor-crosshair w-full h-full z-20"
                                                  onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                    const newPlayers = [...players];
                                                    if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName };
                                                    (newPlayers[pIdx] as { fieldPosition?: { x: number; y: number } }).fieldPosition = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
                                                    updateCategoryPlayers(newPlayers);
                                                  }}
                                                />
                                              </div>
                                              {p.fieldPosition && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                  Posição: X: {Math.round(p.fieldPosition.x ?? 50)}%, Y: {Math.round(p.fieldPosition.y ?? 50)}%
                                                </p>
                                              )}
                                            </div>

                                            {/* Melhores momentos */}
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <Label className="text-xs">Melhores momentos</Label>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-7 text-xs"
                                                  onClick={() => {
                                                    const newPlayers = [...players];
                                                    if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, highlights: [] };
                                                    const highlights = ((newPlayers[pIdx] as { highlights?: string[] }).highlights ?? []);
                                                    highlights.push("");
                                                    (newPlayers[pIdx] as { highlights?: string[] }).highlights = highlights;
                                                    updateCategoryPlayers(newPlayers);
                                                  }}
                                                >
                                                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                                                </Button>
                                              </div>
                                              {/* Buscar playlist do YouTube */}
                                              <PlaylistImporter
                                                onImport={(urls) => {
                                                  const newPlayers = [...players];
                                                  if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, highlights: [] };
                                                  const current = ((newPlayers[pIdx] as { highlights?: string[] }).highlights ?? []);
                                                  const existing = new Set(current);
                                                  const toAdd = urls.filter((u) => !existing.has(u));
                                                  toAdd.forEach((u) => existing.add(u));
                                                  (newPlayers[pIdx] as { highlights?: string[] }).highlights = [...existing];
                                                  updateCategoryPlayers(newPlayers);
                                                }}
                                              />
                                              {((p.highlights as string[]) ?? []).map((url, hIdx) => (
                                                <div key={hIdx} className="flex gap-1">
                                                  <Input
                                                    className="h-8 text-xs"
                                                    placeholder="URL"
                                                    value={url}
                                                    onChange={(e) => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) newPlayers[pIdx] = { id: `player-${Date.now()}`, name: "", currentTeam: tenantName, highlights: [] };
                                                      const highlights = ((newPlayers[pIdx] as { highlights?: string[] }).highlights ?? []);
                                                      highlights[hIdx] = e.target.value;
                                                      (newPlayers[pIdx] as { highlights?: string[] }).highlights = highlights;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  />
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0 text-destructive"
                                                    onClick={() => {
                                                      const newPlayers = [...players];
                                                      if (!newPlayers[pIdx]) return;
                                                      const highlights = ((newPlayers[pIdx] as { highlights?: string[] }).highlights ?? []).filter((_, i) => i !== hIdx);
                                                      (newPlayers[pIdx] as { highlights?: string[] }).highlights = highlights;
                                                      updateCategoryPlayers(newPlayers);
                                                    }}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>

                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="w-full text-destructive"
                                              onClick={() => {
                                                const newPlayers = players.filter((_, i) => i !== pIdx);
                                                updateCategoryPlayers(newPlayers);
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4 mr-1" /> Remover jogador
                                            </Button>
                                          </div>
                                        </details>
                                      );
                                      })}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newPlayers = [...players, { id: `player-${Date.now()}`, name: "", currentTeam: tenantName }];
                                        // Garantir que a categoria existe
                                        const arr = [...((block.config?.timesCategoriasCategories as Array<unknown>) ?? [])];
                                        const idx = arr.findIndex((c: unknown) => (c as { id?: string }).id === cat.value);
                                        if (idx >= 0) {
                                          (arr[idx] as { players?: Array<unknown> }).players = newPlayers;
                                        } else {
                                          arr.push({ id: cat.value, namePT: cat.labelPT, nameEN: cat.labelEN, players: newPlayers });
                                        }
                                        updateBlockConfigValue(index, "timesCategoriasCategories", arr);
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-1" /> Adicionar jogador
                                    </Button>
                                  </div>
                              </details>
                              );
                            })}
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
                        <details open className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Galeria de fotos</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Use RSS para Instagram (via rss.app) ou outro feed com fotos. Cole a URL do feed em RSS.
                            </p>
                            <div className="space-y-2">
                              <Label>Fonte</Label>
                              <Select
                                value={(block.config?.galeriaDataSource as string) ?? "rss"}
                                onValueChange={(v) => updateBlockConfigValue(index, "galeriaDataSource", v)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rss">RSS (Instagram via rss.app, etc.)</SelectItem>
                                  <SelectItem value="manual">Manual (lista editada)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(block.config?.galeriaDataSource as string) !== "manual" && (
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
                                    value={(block.config?.galeriaMaxItems as number) ?? 12}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      updateBlockConfigValue(index, "galeriaMaxItems", Number.isNaN(v) ? 12 : Math.min(24, Math.max(1, v)));
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            {(block.config?.galeriaDataSource as string) === "manual" && (
                              <div className="space-y-2">
                                <Label>Fotos manuais</Label>
                                <p className="text-xs text-muted-foreground">
                                  Adicione fotos manualmente. Use o MediaPicker para cada item.
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
                                          sizeKey="card"
                                          allowAllFolders
                                          value={item.imageUrl ?? ""}
                                          onChange={(url) => {
                                            const arr = [...((block.config?.galeriaManualItems as Array<{ imageUrl?: string; link?: string; title?: string }>) ?? [])];
                                            if (!arr[gi]) arr[gi] = {};
                                            arr[gi] = { ...arr[gi], imageUrl: url };
                                            updateBlockConfigValue(index, "galeriaManualItems", arr);
                                          }}
                                          placeholder="Escolher foto"
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
                        <details open className="rounded-lg border border-border bg-muted/20">
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
                      <div className="space-y-3 sm:col-span-2">
                        <details open className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Espaço no topo e embaixo</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Ajuste o tamanho do espaço vertical da seção Próximos Jogos.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Espaço no topo</Label>
                                <Select
                                  value={(block.config?.proximosJogosPaddingTop as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "proximosJogosPaddingTop", v)}
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
                              <div className="space-y-1">
                                <Label>Espaço embaixo</Label>
                                <Select
                                  value={(block.config?.proximosJogosPaddingBottom as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "proximosJogosPaddingBottom", v)}
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
                            <div className="space-y-2 pt-2">
                              <Label>Carrossel full-bleed</Label>
                              <Select
                                value={(block.config?.fullBleedCarousel as boolean) === true ? "true" : "false"}
                                onValueChange={(v) => updateBlockConfigValue(index, "fullBleedCarousel", v === "true")}
                              >
                                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="false">Não (com padding lateral)</SelectItem>
                                  <SelectItem value="true">Sim (encosta nas bordas do box azul)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Quando Sim, o carrossel ocupa toda a largura da coluna azul, sem espaço nas laterais.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <input
                                type="checkbox"
                                id={`pj-fullbleed-${block.id}`}
                                checked={!!block.config?.fullBleedCarousel}
                                onChange={(e) => updateBlockConfigValue(index, "fullBleedCarousel", e.target.checked)}
                              />
                              <Label htmlFor={`pj-fullbleed-${block.id}`}>
                                Carrossel full-bleed (encosta nas bordas do box azul)
                              </Label>
                            </div>
                          </div>
                        </details>
                        <p className="text-xs text-muted-foreground">
                          Os jogos exibidos são sempre do clube desta página. Fonte: Manual (lista editada) ou AUTO (SofaScore).
                        </p>
                        <div className="space-y-2">
                          <Label>Fonte de dados</Label>
                          <Select
                            value={(block.config?.proximosJogosDataSource as string) ?? "manual"}
                            onValueChange={(v) => updateBlockConfigValue(index, "proximosJogosDataSource", v)}
                          >
                            <SelectTrigger className="w-full max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual (lista editada)</SelectItem>
                              <SelectItem value="sofascore">AUTO (SofaScore)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(block.config?.proximosJogosDataSource as string) === "sofascore" && (
                          <div className="space-y-2">
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm">
                              <p className="font-medium text-amber-800 dark:text-amber-200">Fonte: SofaScore (teamId do clube)</p>
                              <p className="mt-1 text-muted-foreground">
                                Configure o SofaScore Team ID na edição do clube:{" "}
                                <Link href={`/dashboard/empresas/${tenantId}/edit`} className="underline text-amber-700 dark:text-amber-300">
                                  Empresas → [este clube] → Editar → SofaScore Team ID
                                </Link>
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Os próximos jogos serão buscados automaticamente. Use overrides abaixo para ocultar, destacar ou adicionar links (Assistir / Ingresso) por jogo.
                              </p>
                            </div>
                            <div className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                              <strong>Atenção:</strong> A API do SofaScore pode bloquear requisições de servidor (erro 403).
                            </div>
                          </div>
                        )}
                        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Dados dinâmicos (Google Sheets)</p>
                              <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">URL ou ID da planilha</label>
                                  <Input
                                    type="text"
                                    className="h-9"
                                    placeholder="https://docs.google.com/spreadsheets/d/... ou ID da planilha"
                                    value={((block.config?.proximosJogosSpreadsheetUrl as string) ?? "").toString()}
                                    onChange={(e) => updateBlockConfigValue(index, "proximosJogosSpreadsheetUrl", e.target.value)}
                                    onPaste={(e) => {
                                      const pasted = (e.clipboardData?.getData?.("text/plain") ?? "").trim();
                                      if (!pasted) return;
                                      const gidMatch = pasted.match(/[?&]gid=(\d+)/i) || pasted.match(/#gid=(\d+)/i);
                                      if (gidMatch) {
                                        updateBlockConfigValue(index, "proximosJogosSheetGid", gidMatch[1]);
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Aba (gid)</label>
                                    <Input
                                      type="text"
                                      className="h-9 w-20"
                                      placeholder="0"
                                      value={((block.config?.proximosJogosSheetGid as string) ?? "0").toString()}
                                      onChange={(e) => updateBlockConfigValue(index, "proximosJogosSheetGid", e.target.value)}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={syncingProximosJogosBlockIndex === index}
                                    onClick={() => {
                                      const urlOrId = (block.config?.proximosJogosSpreadsheetUrl as string)?.trim();
                                      const gid = ((block.config?.proximosJogosSheetGid as string)?.trim() || "0").toString();
                                      if (!urlOrId) {
                                        setError("Cole ou digite a URL (ou ID) da planilha no campo acima e clique em Atualizar.");
                                        return;
                                      }
                                      setError(null);
                                      updateBlockConfigValue(index, "proximosJogosSpreadsheetUrl", urlOrId);
                                      updateBlockConfigValue(index, "proximosJogosSheetGid", gid);
                                      setSyncingProximosJogosBlockIndex(index);
                                      const params = new URLSearchParams({ spreadsheetId: urlOrId, gid });
                                      authFetch(`/api/google-sheets/proximos-jogos?${params}`, { credentials: "include" })
                                        .then((r) => {
                                          if (!r.ok) return r.json().then((d) => Promise.reject(new Error((d as { error?: string })?.error ?? "Erro ao importar")));
                                          return r.json();
                                        })
                                        .then((data: { fixtures?: object[] }) => {
                                          setError(null);
                                          if (data.fixtures?.length) {
                                            updateBlockConfigValue(index, "proximosJogosManualFixtures", data.fixtures);
                                          } else if (Array.isArray(data.fixtures)) {
                                            updateBlockConfigValue(index, "proximosJogosManualFixtures", []);
                                          }
                                        })
                                        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao importar da planilha"))
                                        .finally(() => setSyncingProximosJogosBlockIndex(null));
                                    }}
                                  >
                                    {syncingProximosJogosBlockIndex === index ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Atualizar com Google Sheets"
                                    )}
                                  </Button>
                                </div>
                              </div>
                              {((block.config?.proximosJogosManualFixtures as object[]) ?? []).length > 0 && (
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const fixtures = (block.config?.proximosJogosManualFixtures as Array<{
                                        startISO?: string;
                                        homeTeamName?: string;
                                        awayTeamName?: string;
                                        competitionName?: string;
                                        venueName?: string;
                                        watchUrl?: string;
                                        ticketUrl?: string;
                                        category?: string;
                                        featured?: boolean;
                                      }>) ?? [];
                                      const csvRows: string[] = [
                                        "data,hora,time_casa,time_visitante,competicao,local,url_assistir,url_ingresso,categoria,destaque,logo_casa,logo_visitante,nosso_time",
                                      ];
                                      fixtures.forEach((f) => {
                                        const d = f.startISO ? new Date(f.startISO) : null;
                                        const date = d && !Number.isNaN(d.getTime())
                                          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                                          : "";
                                        const time = d && !Number.isNaN(d.getTime())
                                          ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                                          : "";
                                        csvRows.push(
                                          [
                                            date,
                                            time,
                                            f.homeTeamName || "",
                                            f.awayTeamName || "",
                                            f.competitionName || "",
                                            f.venueName || "",
                                            f.watchUrl || "",
                                            f.ticketUrl || "",
                                            f.category || "principal",
                                            f.featured ? "sim" : "não",
                                            "",
                                            "",
                                            "",
                                          ].join(",")
                                        );
                                      });
                                      const csv = csvRows.join("\n");
                                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                                      const link = document.createElement("a");
                                      const url = URL.createObjectURL(blob);
                                      link.setAttribute("href", url);
                                      link.setAttribute("download", `proximos-jogos-export-${new Date().toISOString().slice(0, 10)}.csv`);
                                      link.style.visibility = "hidden";
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                  >
                                    Exportar jogos cadastrados para CSV
                                  </Button>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                <p className="font-medium">Opções (cole no campo acima):</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                  <li>
                                    <strong>Link &quot;Publicado na Web&quot;</strong> — Arquivo &gt; Compartilhar &gt; Publicar na Web &gt; escolha a aba &gt; Formato: CSV &gt; copie o link e cole no campo abaixo (Aba pode ficar 0).
                                  </li>
                                  <li>
                                    <strong>URL normal da planilha</strong> — Link de edição (docs.google.com/spreadsheets/d/.../edit). Compartilhar &gt; Qualquer pessoa com o link pode ver. Se der erro, use a opção &quot;Publicar na Web&quot; acima.
                                  </li>
                                  <li>
                                    <strong>ID da planilha</strong> — Só o ID (~44 caracteres) e o gid da aba desejada.
                                  </li>
                                </ul>
                                <p>
                                  Primeira linha = cabeçalho. Use <code className="rounded bg-muted px-1">categoria</code> com: principal, sub20, sub17, sub15, sub13, sub11, sub9, feminino.{" "}
                                  <a href="/api/public/templates/proximos-jogos" download="proximos-jogos-template.csv" className="text-primary underline hover:no-underline">
                                    Baixar template CSV
                                  </a>
                                  {" | "}
                                  <a href="/api/public/cadastros/all?format=csv" download="listas-dropdowns.csv" className="text-primary underline hover:no-underline">
                                    Baixar listas para dropdowns
                                  </a>
                                </p>
                              </div>
                        </div>
                        {(block.config?.proximosJogosDataSource as string) === "manual" && (
                            <details open className="rounded-lg border border-border bg-muted/20 mt-2">
                              <summary className="cursor-pointer px-3 py-2 font-medium">Lista manual de jogos</summary>
                              <div className="border-t border-border px-3 py-3 space-y-3">
                                {page?.tenant?.slug && (
                                  <p className="text-xs text-muted-foreground">
                                    <Link href={`/portfolio/${page.tenant.slug}`} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                                      Ver na página pública →
                                    </Link>
                                  </p>
                                )}
                              {((block.config?.proximosJogosManualFixtures as Array<{ startISO?: string; homeTeamName?: string; awayTeamName?: string; competitionName?: string; venueName?: string; watchUrl?: string; ticketUrl?: string; isOurTeamHome?: boolean; homeTeamLogoUrl?: string; awayTeamLogoUrl?: string; category?: string }>) ?? []).map((f, fi) => {
                                const posValue = f.isOurTeamHome === false ? "away" : "home";
                                const fromISO = (iso: string | undefined) => {
                                  if (!iso?.trim()) return { date: "", time: "20:00" };
                                  const d = new Date(iso);
                                  if (Number.isNaN(d.getTime())) return { date: "", time: "20:00" };
                                  const pad = (n: number) => String(n).padStart(2, "0");
                                  return {
                                    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                                    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
                                  };
                                };
                                const { date: dateVal, time: timeVal } = fromISO(f.startISO);
                                const catLabel = getCategoryLabel((f as { category?: string }).category ?? "principal", "pt");
                                const summaryText = dateVal
                                  ? `Jogo ${fi + 1}: ${catLabel} · ${f.homeTeamName || "Casa"} x ${f.awayTeamName || "Visitante"} — ${dateVal} ${timeVal}`
                                  : `Jogo ${fi + 1}: ${catLabel} · ${f.homeTeamName || "Casa"} x ${f.awayTeamName || "Visitante"} — (sem data)`;
                                return (
                                <details
                                  key={fi}
                                  className="rounded border border-amber-500/40 bg-amber-500/20"
                                  open={fi === (openFixtureByBlockId[block.id] ?? -1)}
                                  onToggle={(e) => {
                                    const el = e.currentTarget;
                                    setOpenFixtureByBlockId((prev) => {
                                      const next = { ...prev };
                                      if (el.open) next[block.id] = fi;
                                      else if (next[block.id] === fi) delete next[block.id];
                                      return next;
                                    });
                                  }}
                                >
                                  <summary className="cursor-pointer px-3 py-2 font-medium hover:bg-amber-500/30 flex items-center justify-between gap-2">
                                    <span>{summaryText}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/20"
                                      title="Remover jogo"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const list = ((block.config?.proximosJogosManualFixtures as object[]) ?? []).filter((_, i) => i !== fi);
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                        setOpenFixtureByBlockId((prev) => {
                                          const next = { ...prev };
                                          if (next[block.id] === fi) delete next[block.id];
                                          else if ((next[block.id] ?? -1) > fi) next[block.id] = (next[block.id] ?? 0) - 1;
                                          return next;
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </summary>
                                <div className="rounded border-t border-border p-3 space-y-2 grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Data</Label>
                                    <div className="flex gap-1">
                                      <input
                                        ref={(el) => { dateInputRefs.current[fi] = el; }}
                                        type="date"
                                        className="flex h-10 flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={dateVal}
                                        onChange={(e) => {
                                          const date = e.target.value;
                                          const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                          const current = fromISO((list[fi] as Record<string, string>).startISO);
                                          const iso = date && current.time ? new Date(`${date}T${current.time}`).toISOString() : "";
                                          (list[fi] as Record<string, string>).startISO = iso;
                                          updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0"
                                        title="Abrir calendário"
                                        onClick={() => dateInputRefs.current[fi]?.showPicker?.()}
                                      >
                                        <CalendarIcon className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Hora</Label>
                                    <input
                                      type="time"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      value={timeVal}
                                      onChange={(e) => {
                                        const time = e.target.value;
                                        const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                        const current = fromISO((list[fi] as Record<string, string>).startISO);
                                        const date = current.date || new Date().toISOString().slice(0, 10);
                                        const iso = time ? new Date(`${date}T${time}`).toISOString() : (list[fi] as Record<string, string>).startISO || "";
                                        (list[fi] as Record<string, string>).startISO = iso;
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Posição do clube neste jogo</Label>
                                    <Select
                                      value={posValue}
                                      onValueChange={(v) => {
                                        const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                        const row = list[fi] as Record<string, string | boolean>;
                                        row.isOurTeamHome = v === "home";
                                        if (v === "home") row.homeTeamName = tenantName;
                                        else row.awayTeamName = tenantName;
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="home">Casa (nosso time é o mandante)</SelectItem>
                                        <SelectItem value="away">Visitante (nosso time joga fora)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Categoria</Label>
                                    <Select
                                      value={(f as { category?: string }).category ?? "principal"}
                                      onValueChange={(v) => {
                                        const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                        (list[fi] as Record<string, string>).category = v;
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FIXTURE_CATEGORIES.map((c) => (
                                          <SelectItem key={c.value} value={c.value}>
                                            {c.labelPT}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1 sm:col-span-2">
                                    <Label className="text-xs">Adversário (time da casa ou visitante)</Label>
                                    <SelectWithCreate
                                      type="visiting-team"
                                      value={posValue === "home" ? (f.awayTeamName ?? "") : (f.homeTeamName ?? "")}
                                      logoUrl={posValue === "home" ? (f.awayTeamLogoUrl as string) ?? "" : (f.homeTeamLogoUrl as string) ?? ""}
                                      onChange={(name, logoUrl) => {
                                        const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                        const row = list[fi] as Record<string, string>;
                                        if (posValue === "home") {
                                          row.awayTeamName = name;
                                          row.awayTeamLogoUrl = logoUrl ?? "";
                                        } else {
                                          row.homeTeamName = name;
                                          row.homeTeamLogoUrl = logoUrl ?? "";
                                        }
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                      }}
                                      placeholder="Selecione o time adversário"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Competição</Label>
                                    <SelectWithCreate
                                      type="championship"
                                      value={f.competitionName ?? ""}
                                      onChange={(name) => {
                                        const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                        (list[fi] as Record<string, string>).competitionName = name;
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                      }}
                                      placeholder="Selecione a competição"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Local (opcional)</Label>
                                    <SelectWithCreate
                                      type="stadium"
                                      value={f.venueName ?? ""}
                                      onChange={(name) => {
                                        const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])];
                                        (list[fi] as Record<string, string>).venueName = name;
                                        updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                      }}
                                      placeholder="Selecione o estádio"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">URL Assistir (opcional)</Label>
                                    <Input placeholder="URL Assistir (opcional)" value={f.watchUrl ?? ""} onChange={(e) => { const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])]; (list[fi] as Record<string, string>).watchUrl = e.target.value; updateBlockConfigValue(index, "proximosJogosManualFixtures", list); }} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">URL Ingresso (opcional)</Label>
                                    <Input placeholder="URL Ingresso (opcional)" value={f.ticketUrl ?? ""} onChange={(e) => { const list = [...((block.config?.proximosJogosManualFixtures as object[]) ?? [])]; (list[fi] as Record<string, string>).ticketUrl = e.target.value; updateBlockConfigValue(index, "proximosJogosManualFixtures", list); }} />
                                  </div>
                                  <div className="flex items-end">
                                    <Button type="button" variant="destructive" size="sm" onClick={() => { const list = ((block.config?.proximosJogosManualFixtures as object[]) ?? []).filter((_, i) => i !== fi); updateBlockConfigValue(index, "proximosJogosManualFixtures", list); }}>Remover</Button>
                                  </div>
                                </div>
                                </details>
                                );
                              })}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const manualList = (block.config?.proximosJogosManualFixtures as object[]) ?? [];
                                  const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                                  const list = [...manualList, { id, startISO: "", homeTeamName: tenantName, awayTeamName: "", competitionName: "", venueName: "", watchUrl: "", ticketUrl: "", isOurTeamHome: true, homeTeamLogoUrl: "", awayTeamLogoUrl: "", category: "principal" }];
                                  updateBlockConfigValue(index, "proximosJogosManualFixtures", list);
                                  setOpenFixtureByBlockId((prev) => ({ ...prev, [block.id]: list.length - 1 }));
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Adicionar jogo
                              </Button>
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                    {block.type === "ultimos_resultados" && (
                      <div className="space-y-3 sm:col-span-2">
                        <details open className="rounded-lg border border-border bg-muted/20">
                          <summary className="cursor-pointer px-3 py-2 font-medium">Últimos resultados</summary>
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Mesma base de Próximos Jogos. Exibe jogos já realizados com placar. Placar vem da API (SofaScore) ou pode ser informado manualmente abaixo.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Máx. resultados exibidos</Label>
                                <Input
                                  type="number"
                                  min={3}
                                  max={30}
                                  value={(block.config?.ultimosResultadosMaxItems as number) ?? 10}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    updateBlockConfigValue(index, "ultimosResultadosMaxItems", Number.isNaN(v) ? 10 : Math.min(30, Math.max(3, v)));
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Espaço no topo</Label>
                                <Select
                                  value={(block.config?.ultimosResultadosPaddingTop as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "ultimosResultadosPaddingTop", v)}
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
                              <div className="space-y-1">
                                <Label>Espaço embaixo</Label>
                                <Select
                                  value={(block.config?.ultimosResultadosPaddingBottom as string) ?? "compact"}
                                  onValueChange={(v) => updateBlockConfigValue(index, "ultimosResultadosPaddingBottom", v)}
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
                            <details className="rounded-lg border border-amber-500/40 bg-amber-500/10 mt-3">
                              <summary className="cursor-pointer px-3 py-2 font-medium">Placares manuais (quando a API não tem)</summary>
                              <div className="border-t border-border px-3 py-3 space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  Se o placar não vier da API, informe aqui. Clique em &quot;Carregar jogos&quot; para listar os jogos passados. Expanda cada jogo para registrar gols, cartões, substituições, pênaltis, formações, estatísticas (posse, finalizações, xG, distância) e vídeos.
                                </p>
                                {!page?.tenant?.slug ? (
                                  <p className="text-xs text-amber-600">Carregue a página primeiro.</p>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={loadingPastFixtures === block.id}
                                      onClick={async () => {
                                        setLoadingPastFixtures(block.id);
                                        try {
                                          const list = await fetchFixtures(page!.tenant!.slug!);
                                          const now = new Date();
                                          const past = list
                                            .filter((f) => new Date(f.startISO) < now)
                                            .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime())
                                            .slice(0, 20);
                                          setPastFixturesByBlock((prev) => ({ ...prev, [block.id]: past }));
                                        } catch (err) {
                                          console.error("Erro ao carregar jogos passados:", err);
                                        } finally {
                                          setLoadingPastFixtures(null);
                                        }
                                      }}
                                    >
                                      {loadingPastFixtures === block.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarIcon className="h-4 w-4 mr-1" />}
                                      {loadingPastFixtures === block.id ? "Carregando…" : "Carregar jogos passados"}
                                    </Button>
                                    {(pastFixturesByBlock[block.id] ?? []).length > 0 && (
                                      <div className="space-y-2">
                                        {(pastFixturesByBlock[block.id] ?? []).map((f) => {
                                          const resultados = (block.config?.resultadosManuais as Record<string, { homeScore: number; awayScore: number }>) ?? {};
                                          const manual = resultados[f.externalId] ?? { homeScore: f.homeScore ?? 0, awayScore: f.awayScore ?? 0 };
                                          const detalhes = ((block.config?.resultadosDetalhes as Record<string, Record<string, unknown>>) ?? {})[f.externalId] ?? {};
                                          const goals = (detalhes.goals as Array<{ minute: number; scorerName: string; team: string }>) ?? [];
                                          const redCards = (detalhes.redCards as Array<{ minute: number; playerName: string; team: string }>) ?? [];
                                          const yellowCards = (detalhes.yellowCards as Array<{ minute: number; playerName: string; team: string }>) ?? [];
                                          const substitutions = (detalhes.substitutions as Array<{ minute: number; playerOut: string; playerIn: string; team: string }>) ?? [];
                                          const penalties = (detalhes.penalties as Array<{ minute: number; playerName: string; team: string; scored: boolean }>) ?? [];
                                          const formations = (detalhes.formations as { home?: string; away?: string }) ?? {};
                                          const stats = (detalhes.stats as Record<string, number>) ?? {};
                                          const videoUrls = (detalhes.videoUrls as string[]) ?? [];
                                          const catLabel = getCategoryLabel(f.category ?? "principal", "pt");
                                          const updateDetalhes = (upd: Record<string, unknown>) => {
                                            const next = { ...((block.config?.resultadosDetalhes as Record<string, unknown>) ?? {}), [f.externalId]: { ...detalhes, ...upd } };
                                            updateBlockConfigValue(index, "resultadosDetalhes", next);
                                          };
                                          return (
                                            <details key={f.externalId} className="rounded border border-border bg-background/50 overflow-hidden group/details">
                                              <summary className="flex flex-wrap items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted/50 list-none [&::-webkit-details-marker]:hidden">
                                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/details:rotate-90" />
                                                <span className="text-xs text-muted-foreground shrink-0 w-14">{catLabel}</span>
                                                {(goals.length > 0 || redCards.length > 0 || yellowCards.length > 0 || (stats.possessionHome != null) || formations.home) && (
                                                  <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5">
                                                    {goals.length > 0 && `${goals.length} gol${goals.length !== 1 ? "s" : ""}`}
                                                    {redCards.length > 0 && `${goals.length > 0 ? " · " : ""}${redCards.length} exp.`}
                                                    {yellowCards.length > 0 && `${goals.length > 0 || redCards.length > 0 ? " · " : ""}${yellowCards.length} am.`}
                                                    {(stats.possessionHome != null || formations.home) && " · +"}
                                                  </span>
                                                )}
                                                <span className="min-w-0 truncate flex-1">{f.homeTeamName}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <Input
                                                    type="number"
                                                    min={0}
                                                    max={99}
                                                    className="w-12 h-8 text-center text-sm"
                                                    value={manual.homeScore}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                      const v = parseInt(e.target.value, 10);
                                                      const next = { ...resultados, [f.externalId]: { ...manual, homeScore: Number.isNaN(v) ? 0 : v } };
                                                      updateBlockConfigValue(index, "resultadosManuais", next);
                                                    }}
                                                  />
                                                  <span className="text-muted-foreground">×</span>
                                                  <Input
                                                    type="number"
                                                    min={0}
                                                    max={99}
                                                    className="w-12 h-8 text-center text-sm"
                                                    value={manual.awayScore}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                      const v = parseInt(e.target.value, 10);
                                                      const next = { ...resultados, [f.externalId]: { ...manual, awayScore: Number.isNaN(v) ? 0 : v } };
                                                      updateBlockConfigValue(index, "resultadosManuais", next);
                                                    }}
                                                  />
                                                </div>
                                                <span className="min-w-0 truncate flex-1 text-right">{f.awayTeamName}</span>
                                              </summary>
                                              <div className="border-t border-border p-3 space-y-4 bg-muted/20">
                                                <div>
                                                  <Label className="text-xs font-medium">Gols (minuto, autor, time)</Label>
                                                  <div className="mt-1 space-y-2">
                                                    {goals.map((g, gi) => (
                                                      <div key={gi} className="flex flex-wrap items-center gap-2">
                                                        <Input type="number" min={0} max={120} placeholder="Min" className="w-16 h-8" value={g.minute || ""} onChange={(e) => { const arr = [...goals]; arr[gi] = { ...arr[gi], minute: parseInt(e.target.value, 10) || 0 }; updateDetalhes({ goals: arr }); }} />
                                                        <Input placeholder="Autor do gol" className="flex-1 min-w-[100px] h-8" value={g.scorerName || ""} onChange={(e) => { const arr = [...goals]; arr[gi] = { ...arr[gi], scorerName: e.target.value }; updateDetalhes({ goals: arr }); }} />
                                                        <Select value={g.team || "home"} onValueChange={(v) => { const arr = [...goals]; arr[gi] = { ...arr[gi], team: v }; updateDetalhes({ goals: arr }); }}>
                                                          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                                          <SelectContent><SelectItem value="home">{f.homeTeamName}</SelectItem><SelectItem value="away">{f.awayTeamName}</SelectItem></SelectContent>
                                                        </Select>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateDetalhes({ goals: goals.filter((_, i) => i !== gi) })}><Trash2 className="h-4 w-4" /></Button>
                                                      </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => updateDetalhes({ goals: [...goals, { minute: 0, scorerName: "", team: "home" }] })}><Plus className="h-4 w-4 mr-1" />Adicionar gol</Button>
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs font-medium">Expulsões (minuto, jogador, time)</Label>
                                                  <div className="mt-1 space-y-2">
                                                    {redCards.map((r, ri) => (
                                                      <div key={ri} className="flex flex-wrap items-center gap-2">
                                                        <Input type="number" min={0} max={120} placeholder="Min" className="w-16 h-8" value={r.minute || ""} onChange={(e) => { const arr = [...redCards]; arr[ri] = { ...arr[ri], minute: parseInt(e.target.value, 10) || 0 }; updateDetalhes({ redCards: arr }); }} />
                                                        <Input placeholder="Jogador expulso" className="flex-1 min-w-[100px] h-8" value={r.playerName || ""} onChange={(e) => { const arr = [...redCards]; arr[ri] = { ...arr[ri], playerName: e.target.value }; updateDetalhes({ redCards: arr }); }} />
                                                        <Select value={r.team || "home"} onValueChange={(v) => { const arr = [...redCards]; arr[ri] = { ...arr[ri], team: v }; updateDetalhes({ redCards: arr }); }}>
                                                          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                                          <SelectContent><SelectItem value="home">{f.homeTeamName}</SelectItem><SelectItem value="away">{f.awayTeamName}</SelectItem></SelectContent>
                                                        </Select>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateDetalhes({ redCards: redCards.filter((_, i) => i !== ri) })}><Trash2 className="h-4 w-4" /></Button>
                                                      </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => updateDetalhes({ redCards: [...redCards, { minute: 0, playerName: "", team: "home" }] })}><Plus className="h-4 w-4 mr-1" />Adicionar expulsão</Button>
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs font-medium">Cartões amarelos</Label>
                                                  <div className="mt-1 space-y-2">
                                                    {yellowCards.map((y, yi) => (
                                                      <div key={yi} className="flex flex-wrap items-center gap-2">
                                                        <Input type="number" min={0} max={120} placeholder="Min" className="w-16 h-8" value={y.minute || ""} onChange={(e) => { const arr = [...yellowCards]; arr[yi] = { ...arr[yi], minute: parseInt(e.target.value, 10) || 0 }; updateDetalhes({ yellowCards: arr }); }} />
                                                        <Input placeholder="Jogador" className="flex-1 min-w-[100px] h-8" value={y.playerName || ""} onChange={(e) => { const arr = [...yellowCards]; arr[yi] = { ...arr[yi], playerName: e.target.value }; updateDetalhes({ yellowCards: arr }); }} />
                                                        <Select value={y.team || "home"} onValueChange={(v) => { const arr = [...yellowCards]; arr[yi] = { ...arr[yi], team: v }; updateDetalhes({ yellowCards: arr }); }}>
                                                          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                                          <SelectContent><SelectItem value="home">{f.homeTeamName}</SelectItem><SelectItem value="away">{f.awayTeamName}</SelectItem></SelectContent>
                                                        </Select>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateDetalhes({ yellowCards: yellowCards.filter((_, i) => i !== yi) })}><Trash2 className="h-4 w-4" /></Button>
                                                      </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => updateDetalhes({ yellowCards: [...yellowCards, { minute: 0, playerName: "", team: "home" }] })}><Plus className="h-4 w-4 mr-1" />Adicionar amarelo</Button>
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs font-medium">Substituições (min, sai, entra, time)</Label>
                                                  <div className="mt-1 space-y-2">
                                                    {substitutions.map((s, si) => (
                                                      <div key={si} className="flex flex-wrap items-center gap-2">
                                                        <Input type="number" min={0} max={120} placeholder="Min" className="w-16 h-8" value={s.minute || ""} onChange={(e) => { const arr = [...substitutions]; arr[si] = { ...arr[si], minute: parseInt(e.target.value, 10) || 0 }; updateDetalhes({ substitutions: arr }); }} />
                                                        <Input placeholder="Sai" className="w-24 h-8" value={s.playerOut || ""} onChange={(e) => { const arr = [...substitutions]; arr[si] = { ...arr[si], playerOut: e.target.value }; updateDetalhes({ substitutions: arr }); }} />
                                                        <Input placeholder="Entra" className="w-24 h-8" value={s.playerIn || ""} onChange={(e) => { const arr = [...substitutions]; arr[si] = { ...arr[si], playerIn: e.target.value }; updateDetalhes({ substitutions: arr }); }} />
                                                        <Select value={s.team || "home"} onValueChange={(v) => { const arr = [...substitutions]; arr[si] = { ...arr[si], team: v }; updateDetalhes({ substitutions: arr }); }}>
                                                          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                                          <SelectContent><SelectItem value="home">{f.homeTeamName}</SelectItem><SelectItem value="away">{f.awayTeamName}</SelectItem></SelectContent>
                                                        </Select>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateDetalhes({ substitutions: substitutions.filter((_, i) => i !== si) })}><Trash2 className="h-4 w-4" /></Button>
                                                      </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => updateDetalhes({ substitutions: [...substitutions, { minute: 0, playerOut: "", playerIn: "", team: "home" }] })}><Plus className="h-4 w-4 mr-1" />Adicionar substituição</Button>
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs font-medium">Pênaltis (min, jogador, time, convertido?)</Label>
                                                  <div className="mt-1 space-y-2">
                                                    {penalties.map((p, pi) => (
                                                      <div key={pi} className="flex flex-wrap items-center gap-2">
                                                        <Input type="number" min={0} max={120} placeholder="Min" className="w-16 h-8" value={p.minute || ""} onChange={(e) => { const arr = [...penalties]; arr[pi] = { ...arr[pi], minute: parseInt(e.target.value, 10) || 0 }; updateDetalhes({ penalties: arr }); }} />
                                                        <Input placeholder="Cobrador" className="flex-1 min-w-[80px] h-8" value={p.playerName || ""} onChange={(e) => { const arr = [...penalties]; arr[pi] = { ...arr[pi], playerName: e.target.value }; updateDetalhes({ penalties: arr }); }} />
                                                        <Select value={p.team || "home"} onValueChange={(v) => { const arr = [...penalties]; arr[pi] = { ...arr[pi], team: v }; updateDetalhes({ penalties: arr }); }}>
                                                          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                                          <SelectContent><SelectItem value="home">{f.homeTeamName}</SelectItem><SelectItem value="away">{f.awayTeamName}</SelectItem></SelectContent>
                                                        </Select>
                                                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!p.scored} onChange={(e) => { const arr = [...penalties]; arr[pi] = { ...arr[pi], scored: e.target.checked }; updateDetalhes({ penalties: arr }); }} />Gol</label>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateDetalhes({ penalties: penalties.filter((_, i) => i !== pi) })}><Trash2 className="h-4 w-4" /></Button>
                                                      </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => updateDetalhes({ penalties: [...penalties, { minute: 0, playerName: "", team: "home", scored: true }] })}><Plus className="h-4 w-4 mr-1" />Adicionar pênalti</Button>
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                  <div>
                                                    <Label className="text-xs font-medium">Formação casa (ex: 4-3-3)</Label>
                                                    <Input className="h-8 mt-1" placeholder="4-3-3" value={formations.home ?? ""} onChange={(e) => updateDetalhes({ formations: { ...formations, home: e.target.value } })} />
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs font-medium">Formação visitante</Label>
                                                    <Input className="h-8 mt-1" placeholder="3-5-2" value={formations.away ?? ""} onChange={(e) => updateDetalhes({ formations: { ...formations, away: e.target.value } })} />
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                  <div><Label className="text-xs">Posse casa %</Label><Input type="number" min={0} max={100} className="h-8 mt-0.5" value={stats.possessionHome ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, possessionHome: e.target.value === "" ? undefined : parseInt(e.target.value, 10) } })} /></div>
                                                  <div><Label className="text-xs">Posse visit. %</Label><Input type="number" min={0} max={100} className="h-8 mt-0.5" value={stats.possessionAway ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, possessionAway: e.target.value === "" ? undefined : parseInt(e.target.value, 10) } })} /></div>
                                                  <div><Label className="text-xs">Finaliz. no alvo casa</Label><Input type="number" min={0} className="h-8 mt-0.5" value={stats.shotsOnTargetHome ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, shotsOnTargetHome: e.target.value === "" ? undefined : parseInt(e.target.value, 10) } })} /></div>
                                                  <div><Label className="text-xs">Finaliz. no alvo visit.</Label><Input type="number" min={0} className="h-8 mt-0.5" value={stats.shotsOnTargetAway ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, shotsOnTargetAway: e.target.value === "" ? undefined : parseInt(e.target.value, 10) } })} /></div>
                                                  <div><Label className="text-xs">xG casa</Label><Input type="number" min={0} step={0.1} className="h-8 mt-0.5" placeholder="0.0" value={stats.xgHome ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, xgHome: e.target.value === "" ? undefined : parseFloat(e.target.value) } })} /></div>
                                                  <div><Label className="text-xs">xG visitante</Label><Input type="number" min={0} step={0.1} className="h-8 mt-0.5" placeholder="0.0" value={stats.xgAway ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, xgAway: e.target.value === "" ? undefined : parseFloat(e.target.value) } })} /></div>
                                                  <div><Label className="text-xs">Distância casa (km)</Label><Input type="number" min={0} step={0.1} className="h-8 mt-0.5" placeholder="0" value={stats.distanceHome ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, distanceHome: e.target.value === "" ? undefined : parseFloat(e.target.value) } })} /></div>
                                                  <div><Label className="text-xs">Distância visit. (km)</Label><Input type="number" min={0} step={0.1} className="h-8 mt-0.5" placeholder="0" value={stats.distanceAway ?? ""} onChange={(e) => updateDetalhes({ stats: { ...stats, distanceAway: e.target.value === "" ? undefined : parseFloat(e.target.value) } })} /></div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs font-medium">URLs de vídeos (gols, lances)</Label>
                                                  <div className="mt-1 space-y-1">
                                                    {videoUrls.map((url, ui) => (
                                                      <div key={ui} className="flex gap-2">
                                                        <Input placeholder="https://..." className="h-8 flex-1" value={url} onChange={(e) => { const arr = [...videoUrls]; arr[ui] = e.target.value; updateDetalhes({ videoUrls: arr }); }} />
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => updateDetalhes({ videoUrls: videoUrls.filter((_, i) => i !== ui) })}><Trash2 className="h-4 w-4" /></Button>
                                                      </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => updateDetalhes({ videoUrls: [...videoUrls, ""] })}><Plus className="h-4 w-4 mr-1" />Adicionar vídeo</Button>
                                                  </div>
                                                </div>
                                              </div>
                                            </details>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </details>
                          </div>
                        </details>
                      </div>
                    )}
                    {block.type === "hero" && (() => {
                      const heroSlides: HeroSlide[] = Array.isArray(block.config?.heroSlides)
                        ? block.config.heroSlides
                        : (Array.isArray(block.config?.heroImages)
                          ? (block.config.heroImages as string[]).map((url) => ({ url, titlePt: "", titleEn: "" }))
                          : []);
                      const interval = (block.config?.heroCarouselIntervalSeconds as HeroCarouselIntervalSeconds) ?? 10;
                      return (
                        <>
                          <details open className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
                            <summary className="cursor-pointer px-3 py-2.5 font-medium">
                              Slides do carrossel (URL + título por foto)
                            </summary>
                            <div className="border-t border-border px-3 py-3 space-y-4">
                              <p className="text-sm text-muted-foreground">
                                Recomendado: <strong>{HERO_RECOMMENDED_DIMENSIONS} px</strong>
                              </p>
                              <div className="space-y-2 sm:col-span-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const arr = [...heroSlides, { url: "", titlePt: "", titleEn: "" }];
                                    updateBlockConfigValue(index, "heroSlides", arr);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Adicionar imagem
                                </Button>
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Tempo em cada foto (temporizador)</Label>
                                <Select
                                  value={String(interval)}
                                  onValueChange={(v) =>
                                    updateBlockConfigValue(index, "heroCarouselIntervalSeconds", Number(v) as HeroCarouselIntervalSeconds)
                                  }
                                >
                                  <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5">5 segundos</SelectItem>
                                    <SelectItem value="10">10 segundos</SelectItem>
                                    <SelectItem value="15">15 segundos</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Efeito do carrossel</Label>
                                <Select
                                  value={(block.config?.heroCarouselEffect as HeroCarouselEffect) ?? "fade"}
                                  onValueChange={(v) =>
                                    updateBlockConfigValue(index, "heroCarouselEffect", v as HeroCarouselEffect)
                                  }
                                >
                                  <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fade">Fade</SelectItem>
                                    <SelectItem value="slide">Slide</SelectItem>
                                    <SelectItem value="zoom">Zoom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Slides do carrossel (URL + título por foto)</Label>
                                {heroSlides.map((slide, i) => (
                                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                    <MediaPicker
                                      label={`Imagem ${i + 1}`}
                                      sizeKey="hero"
                                      allowAllFolders
                                      value={slide.url}
                                      onChange={(url) => {
                                        const arr = [...heroSlides];
                                        arr[i] = { ...arr[i], url };
                                        updateBlockConfigValue(index, "heroSlides", arr);
                                      }}
                                      placeholder="Escolher da mídia (hero)"
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Ou cole a URL manualmente"
                                        value={slide.url}
                                        onChange={(e) => {
                                          const arr = [...heroSlides];
                                          arr[i] = { ...arr[i], url: e.target.value };
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => {
                                          const arr = heroSlides.filter((_, j) => j !== i);
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <Input
                                        placeholder="Título da foto (PT)"
                                        value={slide.titlePt ?? ""}
                                        onChange={(e) => {
                                          const arr = [...heroSlides];
                                          arr[i] = { ...arr[i], titlePt: e.target.value };
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      />
                                      <Input
                                        placeholder="Title (EN)"
                                        value={slide.titleEn ?? ""}
                                        onChange={(e) => {
                                          const arr = [...heroSlides];
                                          arr[i] = { ...arr[i], titleEn: e.target.value };
                                          updateBlockConfigValue(index, "heroSlides", arr);
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                          <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2" open>
                            <summary className="cursor-pointer px-3 py-2 font-medium">Conteúdo (título já acima)</summary>
                            <div className="border-t border-border px-3 py-3 space-y-3">
                              <div className="space-y-2">
                                <Label>Subtítulo (PT)</Label>
                                <Input
                                  placeholder="Frase de posicionamento"
                                  value={(block.config?.subtitlePT as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "subtitlePT", e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Subtitle (EN)</Label>
                                <Input
                                  placeholder="Positioning phrase"
                                  value={(block.config?.subtitleEN as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "subtitleEN", e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Descrição (PT) — opcional</Label>
                                <textarea
                                  placeholder="Até 3 linhas"
                                  value={(block.config?.descriptionPT as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "descriptionPT", e.target.value)}
                                  rows={3}
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Description (EN) — optional</Label>
                                <textarea
                                  placeholder="Up to 3 lines"
                                  value={(block.config?.descriptionEN as string) ?? ""}
                                  onChange={(e) => updateBlockConfig(index, "descriptionEN", e.target.value)}
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
                      );
                    })()}
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
                              <details className="rounded-lg border border-border bg-muted/20" open>
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
                          <details open className="rounded-lg border border-border bg-muted/20">
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
                        <details open className="rounded-lg border border-border bg-muted/20">
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
                        <details className="rounded-lg border border-border bg-muted/20" open>
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
