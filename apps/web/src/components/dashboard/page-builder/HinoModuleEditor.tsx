"use client";

import type { BlockConfigValue } from "@/types/block-config";
import type { HomeContentBlock } from "@/types/home-content";
import { AudioMediaPicker } from "@/components/dashboard/AudioMediaPicker";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { ModuleTitleGradientFields } from "@/components/dashboard/page-builder/ModuleTitleGradientFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Guitar, Mic2, Music, ScrollText } from "lucide-react";

interface HinoModuleEditorProps {
  block: HomeContentBlock;
  index: number;
  updateBlockConfig: (index: number, key: string, value: string | undefined) => void;
  updateBlockConfigValue: (index: number, key: string, value: BlockConfigValue) => void;
}

const PADDING_OPTIONS = [
  { value: "minimal", label: "Mínimo" },
  { value: "compact", label: "Compacto" },
  { value: "large", label: "Amplo" },
] as const;

export function HinoModuleEditor({
  block,
  index,
  updateBlockConfig,
  updateBlockConfigValue,
}: HinoModuleEditorProps) {
  const defaultTab = (block.config?.hinoDefaultTab as string) ?? "letra";

  return (
    <details open className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent sm:col-span-2">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium">
        <Mic2 className="h-4 w-4 text-amber-400" />
        Hino do clube — letra, cifra, partitura e áudio
      </summary>
      <div className="space-y-5 border-t border-border px-3 py-4">
        <p className="text-xs text-muted-foreground">
          Player com vinil + karaoke (letra linha a linha). À direita: cifra interativa. Para sincronia precisa, use timestamps LRC na letra (ex.: [0:12.50] texto).
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Título (PT)</Label>
            <Input
              placeholder="Hino do Clube"
              value={(block.config?.titlePt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Título (EN)</Label>
            <Input
              placeholder="Club Anthem"
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Compositor (PT)</Label>
            <Input
              placeholder="Nome do compositor"
              value={(block.config?.hinoCompositorPt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoCompositorPt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Composer (EN)</Label>
            <Input
              placeholder="Composer name"
              value={(block.config?.hinoCompositorEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoCompositorEn", e.target.value)}
            />
          </div>
        </div>

        <AudioMediaPicker
          value={(block.config?.hinoAudioUrl as string) ?? ""}
          onChange={(url) => updateBlockConfig(index, "hinoAudioUrl", url || undefined)}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Intro instrumental (segundos)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              placeholder="8"
              value={(block.config?.hinoKaraokeIntroSec as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoKaraokeIntroSec", e.target.value || undefined)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo antes da 1ª linha (sem timestamps LRC). Ajuste se a letra entrar cedo ou tarde.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              Letra (PT)
            </Label>
            <textarea
              rows={8}
              placeholder={"[0:08.00] Salve, tricolor campeão\n[0:15.50] De glórias mil…\n\n(ou letra simples, sem timestamps)"}
              value={(block.config?.hinoLetraPt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoLetraPt", e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              Lyrics (EN)
            </Label>
            <textarea
              rows={8}
              placeholder={"Hail, champion club\nOf a thousand glories…"}
              value={(block.config?.hinoLetraEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoLetraEn", e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Guitar className="h-3.5 w-3.5" />
              Cifra (PT)
            </Label>
            <textarea
              rows={8}
              placeholder={"[Am]        [G]\nSalve tricolor…"}
              value={(block.config?.hinoCifraPt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoCifraPt", e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
            />
            <p className="text-xs text-muted-foreground">Use [Am], [G7], etc. — os acordes aparecem em destaque dourado.</p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Guitar className="h-3.5 w-3.5" />
              Chords (EN)
            </Label>
            <textarea
              rows={8}
              placeholder={"[Am]        [G]\nHail champion…"}
              value={(block.config?.hinoCifraEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoCifraEn", e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <Label className="flex items-center gap-1.5">
            <Guitar className="h-3.5 w-3.5" />
            Cifra interativa (embed — ex.: Moises)
          </Label>
          <Input
            placeholder="https://extensions-prod.moises.ai/shared-chords/…"
            value={(block.config?.hinoChordsEmbedUrl as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "hinoChordsEmbedUrl", e.target.value || undefined)}
          />
          <p className="text-xs text-muted-foreground">
            Cole o link compartilhado da cifra. A barra superior da Moises (Copy Link) fica oculta no site; o crédito Moises aparece abaixo do embed.
          </p>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={
                block.config?.hinoEmbedDarkFilter !== false &&
                block.config?.hinoEmbedDarkFilter !== "false"
              }
              onChange={(e) =>
                updateBlockConfigValue(index, "hinoEmbedDarkFilter", e.target.checked ? "true" : "false")
              }
            />
            Fundo escuro no embed (recomendado — evita o branco da página externa)
          </label>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5" />
            Partitura (imagem)
          </Label>
          <MediaPicker
            label=""
            sizeKey="card"
            allowAllFolders
            value={(block.config?.hinoPartituraUrl as string) ?? ""}
            onChange={(url) => updateBlockConfig(index, "hinoPartituraUrl", url || undefined)}
            placeholder="Escolher imagem da partitura…"
          />
          <Input
            placeholder="Ou cole a URL manualmente"
            value={(block.config?.hinoPartituraUrl as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "hinoPartituraUrl", e.target.value || undefined)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Aba padrão ao abrir</Label>
            <Select
              value={defaultTab}
              onValueChange={(v) => updateBlockConfigValue(index, "hinoDefaultTab", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letra">Letra</SelectItem>
                <SelectItem value="cifra">Cifra (texto)</SelectItem>
                <SelectItem value="cifraEmbed">Cifra interativa</SelectItem>
                <SelectItem value="partitura">Partitura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cor de destaque (player / abas)</Label>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                value={(block.config?.hinoAccentColor as string)?.trim() || "#fbbf24"}
                onChange={(e) => updateBlockConfig(index, "hinoAccentColor", e.target.value)}
              />
              <Input
                placeholder="#fbbf24 (vazio = cor do tema)"
                value={(block.config?.hinoAccentColor as string) ?? ""}
                onChange={(e) => updateBlockConfig(index, "hinoAccentColor", e.target.value || undefined)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Legenda do player (PT)</Label>
            <Input
              placeholder="Ouça o hino oficial"
              value={(block.config?.hinoPlayerLabelPt as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoPlayerLabelPt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Player label (EN)</Label>
            <Input
              placeholder="Listen to the official anthem"
              value={(block.config?.hinoPlayerLabelEn as string) ?? ""}
              onChange={(e) => updateBlockConfig(index, "hinoPlayerLabelEn", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Espaçamento superior</Label>
            <Select
              value={(block.config?.hinoPaddingTop as string) ?? "compact"}
              onValueChange={(v) => updateBlockConfigValue(index, "hinoPaddingTop", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADDING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Espaçamento inferior</Label>
            <Select
              value={(block.config?.hinoPaddingBottom as string) ?? "compact"}
              onValueChange={(v) => updateBlockConfigValue(index, "hinoPaddingBottom", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADDING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </details>
  );
}
