"use client";

import { ChevronDown, LayoutPanelTop, Menu, Plus, Trash2, Newspaper } from "lucide-react";
import type { BlockConfigValue } from "@/types/block-config";
import type { HomeContentBlock } from "@/types/home-content";
import type { ImprensaCondutaSection } from "@/lib/imprensa-clube-default";
import { buildDefaultImprensaCondutaSections, DEFAULT_IMPRENSA_RELEASE_EN, DEFAULT_IMPRENSA_RELEASE_PT } from "@/lib/imprensa-clube-default";
import { AudioMediaPicker } from "@/components/dashboard/AudioMediaPicker";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { ModuleTitleGradientFields } from "@/components/dashboard/page-builder/ModuleTitleGradientFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImprensaDisplayMode } from "@/lib/imprensa-display";
import { getImprensaPageHref } from "@/lib/imprensa-display";
import { cn } from "@/lib/utils";

interface ImprensaEditorBaseProps {
  block: HomeContentBlock;
  index: number;
  updateBlockConfig: (index: number, key: string, value: string | undefined) => void;
  updateBlockConfigValue: (index: number, key: string, value: BlockConfigValue) => void;
  clubSlug?: string;
  tenantId?: string;
}

/** Primeira opção do módulo Imprensa — fixa no topo do card, antes de Aparência. */
export function ImprensaDisplayModeFields({
  block,
  index,
  updateBlockConfig,
  updateBlockConfigValue,
  clubSlug,
  tenantId,
}: ImprensaEditorBaseProps) {
  const displayMode = ((block.config?.imprensaDisplayMode as string) ?? "inline") as ImprensaDisplayMode;
  const showInMenu = block.config?.imprensaShowInMenu !== false;
  const requireAccessCode = block.config?.imprensaRequireAccessCode !== false;
  const imprensaPagePath = clubSlug ? getImprensaPageHref(clubSlug) : "/portfolio/{slug}/imprensa";

  return (
    <div className="sm:col-span-2 rounded-lg border-2 border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-violet-950/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="h-4 w-4 shrink-0 text-violet-400" />
        <Label className="text-sm font-semibold">Onde exibir a imprensa</Label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={cn(
            "flex min-h-[52px] flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
            displayMode === "inline"
              ? "border-violet-500 bg-violet-500/20 text-foreground"
              : "border-border bg-background/60 text-muted-foreground hover:border-violet-500/40 hover:bg-violet-500/5",
          )}
          onClick={() => updateBlockConfigValue(index, "imprensaDisplayMode", "inline")}
        >
          <span className="flex items-center gap-2 font-medium">
            <LayoutPanelTop className="h-4 w-4 shrink-0" />
            Como módulo
          </span>
          <span className="text-xs opacity-80">Na página principal do site</span>
        </button>
        <button
          type="button"
          className={cn(
            "flex min-h-[52px] flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
            displayMode === "page"
              ? "border-violet-500 bg-violet-500/20 text-foreground"
              : "border-border bg-background/60 text-muted-foreground hover:border-violet-500/40 hover:bg-violet-500/5",
          )}
          onClick={() => {
            updateBlockConfigValue(index, "imprensaDisplayMode", "page");
            if (block.config?.imprensaRequireAccessCode === undefined) {
              updateBlockConfigValue(index, "imprensaRequireAccessCode", true);
            }
          }}
        >
          <span className="flex items-center gap-2 font-medium">
            <Menu className="h-4 w-4 shrink-0" />
            No menu
          </span>
          <span className="text-xs opacity-80">Página separada com link no header</span>
        </button>
      </div>

      {displayMode === "page" ? (
        <div className="mt-4 space-y-3 border-t border-violet-500/20 pt-4">
          <p className="text-xs text-muted-foreground">
            URL: <code className="rounded bg-muted px-1">{imprensaPagePath}</code>
          </p>
          <div className="flex items-start gap-3">
            <Checkbox
              id={`imprensa-menu-top-${index}`}
              checked={showInMenu}
              onCheckedChange={(checked) =>
                updateBlockConfigValue(index, "imprensaShowInMenu", checked === true)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={`imprensa-menu-top-${index}`} className="cursor-pointer">
                Link no menu do header
              </Label>
              <p className="text-xs text-muted-foreground">Sem precisar cadastrar manualmente no cabeçalho.</p>
            </div>
          </div>
          {showInMenu ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rótulo no menu (PT)</Label>
                <Input
                  placeholder="Imprensa"
                  value={(block.config?.imprensaMenuLabelPt as string) ?? ""}
                  onChange={(e) => updateBlockConfig(index, "imprensaMenuLabelPt", e.target.value || undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rótulo no menu (EN)</Label>
                <Input
                  placeholder="Press"
                  value={(block.config?.imprensaMenuLabelEn as string) ?? ""}
                  onChange={(e) => updateBlockConfig(index, "imprensaMenuLabelEn", e.target.value || undefined)}
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            <Checkbox
              id={`imprensa-access-${index}`}
              checked={requireAccessCode}
              onCheckedChange={(checked) =>
                updateBlockConfigValue(index, "imprensaRequireAccessCode", checked === true)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={`imprensa-access-${index}`} className="cursor-pointer">
                Exigir código de acesso
              </Label>
              <p className="text-xs text-muted-foreground">
                Quem acessar a URL precisa do código gerado abaixo.
              </p>
            </div>
          </div>
          {requireAccessCode ? (
            <p className="rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-muted-foreground">
              Gere e gerencie códigos em{" "}
              <a href="/dashboard/assessoria-imprensa" className="font-medium text-primary underline">
                Assessoria de Imprensa
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface ImprensaModuleEditorProps extends ImprensaEditorBaseProps {
  tenantId?: string;
  clubName?: string;
}

const PADDING_OPTIONS = [
  { value: "minimal", label: "Mínimo" },
  { value: "compact", label: "Compacto" },
  { value: "large", label: "Amplo" },
] as const;

export function ImprensaModuleEditor({
  block,
  index,
  updateBlockConfig,
  updateBlockConfigValue,
  tenantId,
  clubSlug,
  clubName,
}: ImprensaModuleEditorProps) {
  const sections = (block.config?.imprensaCondutaSections as ImprensaCondutaSection[] | undefined) ?? [];

  const loadDefaultManual = () => {
    updateBlockConfigValue(index, "imprensaCondutaSections", buildDefaultImprensaCondutaSections(clubName ?? "Clube"));
    if (!(block.config?.imprensaReleasePt as string)?.trim()) {
      updateBlockConfig(index, "imprensaReleasePt", DEFAULT_IMPRENSA_RELEASE_PT);
      updateBlockConfig(index, "imprensaReleaseEn", DEFAULT_IMPRENSA_RELEASE_EN);
    }
  };

  const updateSection = (si: number, patch: Partial<ImprensaCondutaSection>) => {
    const arr = [...sections];
    arr[si] = { ...arr[si]!, ...patch };
    updateBlockConfigValue(index, "imprensaCondutaSections", arr);
  };

  return (
    <details open className="rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent sm:col-span-2">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium">
        <Newspaper className="h-4 w-4 text-violet-400" />
        Imprensa / kit de marca
      </summary>
      <div className="space-y-5 border-t border-border px-3 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Título (PT)</Label>
            <Input
              placeholder="Imprensa / kit de marca"
              value={(block.config?.titlePt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Título (EN)</Label>
            <Input
              placeholder="Press office"
              value={(block.config?.titleEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value)}
            />
          </div>
        </div>

        <ModuleTitleGradientFields
          gradientStart={(block.config?.titleGradientStart as string) ?? ""}
          gradientEnd={(block.config?.titleGradientEnd as string) ?? ""}
          onGradientStart={(v) => updateBlockConfig(index, "titleGradientStart", v || undefined)}
          onGradientEnd={(v) => updateBlockConfig(index, "titleGradientEnd", v || undefined)}
        />

        <div className="rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-muted-foreground">
          Press releases e cadastro de jornalistas ficam em{" "}
          <a href="/dashboard/assessoria-imprensa" className="font-medium text-primary underline">
            Assessoria de Imprensa
          </a>
          .
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Texto contato assessoria (PT)</Label>
            <textarea
              rows={2}
              placeholder="Horário de atendimento, instruções…"
              value={(block.config?.imprensaContatoTextoPt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "imprensaContatoTextoPt", e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Contact text (EN)</Label>
            <textarea
              rows={2}
              value={(block.config?.imprensaContatoTextoEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "imprensaContatoTextoEn", e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>E-mail assessoria (contato na página)</Label>
            <Input
              type="email"
              placeholder="imprensa@clube.com.br"
              value={(block.config?.imprensaContatoEmail as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "imprensaContatoEmail", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(31) 99999-9999"
              value={(block.config?.imprensaContatoTelefone as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "imprensaContatoTelefone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp (só números)</Label>
            <Input
              placeholder="5531999999999"
              value={(block.config?.imprensaContatoWhatsapp as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "imprensaContatoWhatsapp", e.target.value)}
            />
          </div>
        </div>

        <MediaPicker
          label="Logo para imprensa (opcional — padrão: logo do clube)"
          sizeKey="card"
          allowAllFolders
          value={(block.config?.imprensaLogoUrl as string) ?? ""}
          onChange={(url) => updateBlockConfig(index, "imprensaLogoUrl", url || undefined)}
        />

        <AudioMediaPicker
          label="Hino do clube (MP3 para download)"
          value={(block.config?.imprensaHinoAudioUrl as string) ?? ""}
          onChange={(url) => updateBlockConfig(index, "imprensaHinoAudioUrl", url || undefined)}
        />

        <MediaPicker
          label="Manual de marca (PDF)"
          sizeKey="imprensa_docs"
          value={(block.config?.imprensaManualMarcaUrl as string) ?? ""}
          onChange={(url) => updateBlockConfig(index, "imprensaManualMarcaUrl", url || undefined)}
          placeholder="Enviar PDF do manual de marca…"
        />
        <Input
          placeholder="Ou cole a URL do PDF manualmente"
          value={(block.config?.imprensaManualMarcaUrl as string) ?? ""}
          onChange={(e) => updateBlockConfig(index, "imprensaManualMarcaUrl", e.target.value || undefined)}
        />

        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
              <span className="text-base font-medium">Manual de conduta para imprensa</span>
              {sections.length > 0 ? (
                <span className="text-xs text-muted-foreground">({sections.length} seções)</span>
              ) : null}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                loadDefaultManual();
              }}
            >
              Carregar modelo (Villa Nova / SAF)
            </Button>
          </summary>
          <div className="space-y-2 border-t border-border px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Clique em cada seção para editar. Recolhido por padrão para não ocupar a tela inteira.
            </p>
            {sections.map((sec, si) => (
              <details key={sec.id} className="group/sec rounded border border-border/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open/sec:rotate-180" />
                    <span className="truncate font-medium">
                      Seção {si + 1}
                      {sec.titlePt?.trim() ? `: ${sec.titlePt.trim()}` : ""}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const arr = sections.filter((_, j) => j !== si);
                      updateBlockConfigValue(index, "imprensaCondutaSections", arr);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </summary>
                <div className="space-y-2 border-t border-border/60 p-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Título PT" value={sec.titlePt} onChange={(e) => updateSection(si, { titlePt: e.target.value })} />
                    <Input placeholder="Title EN" value={sec.titleEn} onChange={(e) => updateSection(si, { titleEn: e.target.value })} />
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Texto PT"
                    value={sec.bodyPt}
                    onChange={(e) => updateSection(si, { bodyPt: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder="Text EN"
                    value={sec.bodyEn}
                    onChange={(e) => updateSection(si, { bodyEn: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              </details>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const arr = [
                  ...sections,
                  {
                    id: `sec-${Date.now()}`,
                    titlePt: "",
                    titleEn: "",
                    bodyPt: "",
                    bodyEn: "",
                  },
                ];
                updateBlockConfigValue(index, "imprensaCondutaSections", arr);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar seção
            </Button>
          </div>
        </details>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Espaçamento superior</Label>
            <Select
              value={(block.config?.imprensaPaddingTop as string) ?? "compact"}
              onValueChange={(v) => updateBlockConfigValue(index, "imprensaPaddingTop", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PADDING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Espaçamento inferior</Label>
            <Select
              value={(block.config?.imprensaPaddingBottom as string) ?? "compact"}
              onValueChange={(v) => updateBlockConfigValue(index, "imprensaPaddingBottom", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PADDING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </details>
  );
}
