"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import type { PageTheme } from "@/types/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { FontFamilyField } from "./FontFamilyField";

interface ModuleAppearancePanelProps {
  block: HomeContentBlock;
  index: number;
  theme: PageTheme;
  updateBlockConfig: (index: number, key: string, value: unknown) => void;
  updateBlockConfigValue?: (index: number, key: string, value: BlockConfigValue) => void;
  /** Fundo transparente com botão limpar (tenant). */
  allowClearBackground?: boolean;
}

const NO_BG_TYPES = new Set(["hero", "global_presence", "logo_carousel"]);
const NO_OVERLAY_TYPES = new Set(["header", "global_presence", "logo_carousel"]);
const NO_SIZE_TYPES = new Set([
  "header",
  "footer",
  "global_presence",
  "logo_carousel",
  "section",
  "noticias",
  "ultimos_resultados",
]);

export function ModuleAppearancePanel({
  block,
  index,
  theme,
  updateBlockConfig,
  allowClearBackground = false,
}: ModuleAppearancePanelProps) {
  if (block.type === "header") return null;

  const themeFont = (theme.fontFamily as string)?.trim() || "Geist Sans";
  const themeWidth = theme.contentWidth === "full" ? "full width" : "box";
  const themeAlign =
    theme.titleAlign === "center" ? "centro" : theme.titleAlign === "right" ? "direita" : "esquerda";

  return (
    <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2" open>
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">
        Aparência do módulo
      </summary>
      <div className="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2">
        {(block.type === "proximos_jogos" ||
          block.type === "noticias" ||
          block.type === "ultimos_resultados" ||
          block.type === "tabela") && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Deixe cor e imagem vazios para continuar o fundo da página sem “bloco” separado.
          </p>
        )}

        <FontFamilyField
          className="sm:col-span-2"
          value={(block.config?.fontFamily as string) ?? ""}
          onChange={(v) => updateBlockConfig(index, "fontFamily", v)}
          allowInherit
          inheritLabel={`Padrão da página (${themeFont})`}
        />

        <div className="space-y-2">
          <Label>Largura do conteúdo</Label>
          <Select
            value={(block.config?.contentWidth as string) ?? "inherit"}
            onValueChange={(v) => updateBlockConfig(index, "contentWidth", v === "inherit" ? undefined : v)}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">Padrão ({themeWidth})</SelectItem>
              <SelectItem value="box">Box (centralizado)</SelectItem>
              <SelectItem value="full">Largura total</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {block.type !== "footer" ? (
          <div className="space-y-2">
            <Label>Alinhamento do título</Label>
            <Select
              value={(block.config?.titleAlign as string) ?? "inherit"}
              onValueChange={(v) => updateBlockConfig(index, "titleAlign", v === "inherit" ? undefined : v)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Padrão ({themeAlign})</SelectItem>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

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
                  updateBlockConfig(index, "showModuleBorder", e.target.checked ? "true" : undefined)
                }
              />
              Linha separadora abaixo do módulo
            </label>
            <p className="text-xs text-muted-foreground">
              Borda fina cinza entre este módulo e o próximo. Desligado por padrão.
            </p>
          </div>
        ) : null}

        {!NO_BG_TYPES.has(block.type) ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>Cor de fundo</Label>
            {allowClearBackground ? (
              <p className="text-xs text-muted-foreground">Vazio = transparente (herda o tema).</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                value={(block.config?.backgroundColor as string)?.trim() || "#18181b"}
                onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
              />
              <Input
                placeholder={allowClearBackground ? "Vazio = transparente" : "#18181b"}
                className="min-w-[120px] flex-1"
                value={(block.config?.backgroundColor as string) ?? ""}
                onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value)}
              />
              {allowClearBackground ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateBlockConfig(index, "backgroundColor", "")}
                >
                  Limpar
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!NO_OVERLAY_TYPES.has(block.type) ? (
          <>
            <div className="space-y-2">
              <Label>Opacidade overlay (0–1)</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.1}
                placeholder="0.75"
                value={(block.config?.backgroundOverlayOpacity as number) ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateBlockConfig(index, "backgroundOverlayOpacity", v === "" ? undefined : String(Number(v)));
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <MediaPicker
                label="Imagem de fundo"
                sizeKey="section_bg"
                allowAllFolders
                allowUpload
                value={(block.config?.backgroundImage as string) ?? ""}
                onChange={(url) => updateBlockConfig(index, "backgroundImage", url || undefined)}
                placeholder="Escolher da mídia"
              />
              <Input
                className="mt-1"
                placeholder="Ou cole a URL manualmente"
                value={(block.config?.backgroundImage as string) ?? ""}
                onChange={(e) => updateBlockConfig(index, "backgroundImage", e.target.value)}
              />
            </div>
          </>
        ) : null}

        {!NO_SIZE_TYPES.has(block.type) ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>Altura / espaço da seção</Label>
            <Select
              value={(block.config?.sectionSize as string) ?? "normal"}
              onValueChange={(v) => updateBlockConfig(index, "sectionSize", v)}
            >
              <SelectTrigger className="min-h-[44px] max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Mínimo</SelectItem>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </details>
  );
}
