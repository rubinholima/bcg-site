"use client";

import { useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import type { PageTheme } from "@/types/page";
import { getBlockDefinition } from "@bcg/page-builder-core";
import { ModuleAppearancePanel } from "./ModuleAppearancePanel";
import { BlockAlignmentFields } from "./BlockAlignmentFields";
import { FontFamilyField } from "./FontFamilyField";
import { MediaStyleFields } from "./MediaStyleFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PreviewViewport } from "./usePageEditorSession";

export function BlockStylePanel({
  block,
  index,
  theme,
  updateBlockConfig,
  updateBlockConfigValue,
  viewport = "desktop",
  onViewportChange,
}: {
  block: HomeContentBlock;
  index: number;
  theme: PageTheme;
  updateBlockConfig: (index: number, key: string, value: string | undefined) => void;
  updateBlockConfigValue?: (index: number, key: string, value: BlockConfigValue) => void;
  viewport?: PreviewViewport;
  onViewportChange?: (v: PreviewViewport) => void;
}) {
  const def = getBlockDefinition(block.type);
  const caps = def?.editorCapabilities ?? { appearance: true, typography: true, layout: true, responsive: true };
  const [tab, setTab] = useState<"style" | "advanced">("style");
  const cfg = block.config ?? {};
  const resp = (cfg.styleResponsive as Record<string, Record<string, unknown>> | undefined) ?? {};
  const vpCfg = viewport === "desktop" ? cfg : { ...cfg, ...(resp[viewport] ?? {}) };

  const setVal = (key: string, value: BlockConfigValue) => {
    if (viewport === "desktop") {
      if (updateBlockConfigValue) {
        updateBlockConfigValue(index, key, value);
      } else if (typeof value === "string" || value === undefined) {
        updateBlockConfig(index, key, value);
      }
      return;
    }
    const next = { ...resp, [viewport]: { ...(resp[viewport] ?? {}), [key]: value } };
    if (!updateBlockConfigValue) return;
    updateBlockConfigValue(index, "styleResponsive", next);
  };

  const resetInherited = () => {
    if (viewport === "desktop") return;
    const next = { ...resp };
    delete next[viewport];
    if (!updateBlockConfigValue) return;
    updateBlockConfigValue(index, "styleResponsive", next);
  };

  if (!caps.appearance && block.type !== "header") return null;

  return (
    <div className="space-y-2 sm:col-span-2">
      {onViewportChange ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Estilo —</span>
          {(["desktop", "tablet", "mobile"] as PreviewViewport[]).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={viewport === v ? "default" : "outline"}
              className="h-8"
              onClick={() => onViewportChange(v)}
            >
              {v === "desktop" ? "Desktop" : v === "tablet" ? "Tablet" : "Mobile"}
            </Button>
          ))}
          {viewport !== "desktop" ? (
            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={resetInherited}>
              Herdar do desktop
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex gap-1">
        <Button type="button" size="sm" variant={tab === "style" ? "secondary" : "ghost"} onClick={() => setTab("style")}>
          Estilo
        </Button>
        <Button type="button" size="sm" variant={tab === "advanced" ? "secondary" : "ghost"} onClick={() => setTab("advanced")}>
          Avançado
        </Button>
      </div>
      {tab === "style" ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
          {viewport === "desktop" ? (
            <ModuleAppearancePanel
              block={block}
              index={index}
              theme={theme}
              updateBlockConfig={(i, k, v) =>
                updateBlockConfig(i, k, v === undefined || typeof v === "string" ? v : String(v))
              }
              updateBlockConfigValue={updateBlockConfigValue}
              allowClearBackground
            />
          ) : null}
          {caps.typography ? (
            <>
              <FontFamilyField
                value={(vpCfg.fontFamily as string) ?? ""}
                onChange={(v) => setVal("fontFamily", v)}
                allowInherit
                inheritLabel="Herdar"
              />
              <BlockAlignmentFields
                titleAlign={vpCfg.titleAlign as string}
                bodyAlign={vpCfg.bodyAlign as string}
                onTitleAlign={(v) => setVal("titleAlign", v)}
                onBodyAlign={(v) => setVal("bodyAlign", v)}
                showSubtitle={false}
              />
            </>
          ) : null}
          <MediaStyleFields config={vpCfg} onChange={(k, v) => setVal(k, v)} />
        </div>
      ) : (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/15 p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Margem superior (px)</Label>
            <Input value={String(vpCfg.marginTop ?? "")} onChange={(e) => setVal("marginTop", e.target.value || undefined)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Margem inferior (px)</Label>
            <Input value={String(vpCfg.marginBottom ?? "")} onChange={(e) => setVal("marginBottom", e.target.value || undefined)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Padding superior</Label>
            <Input value={String(vpCfg.sectionPaddingTop ?? "")} onChange={(e) => setVal("sectionPaddingTop", e.target.value || undefined)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Padding inferior</Label>
            <Input value={String(vpCfg.sectionPaddingBottom ?? "")} onChange={(e) => setVal("sectionPaddingBottom", e.target.value || undefined)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Largura máxima</Label>
            <Select
              value={(vpCfg.maxContentWidth as string) ?? "inherit"}
              onValueChange={(v) => setVal("maxContentWidth", v === "inherit" ? undefined : v)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Herdar</SelectItem>
                <SelectItem value="narrow">Estreita</SelectItem>
                <SelectItem value="wide">Larga</SelectItem>
                <SelectItem value="full">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Visibilidade</Label>
            <Select
              value={vpCfg.visible === false ? "hidden" : "visible"}
              onValueChange={(v) => setVal("visible", v === "hidden" ? false : true)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visível</SelectItem>
                <SelectItem value="hidden">Oculto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
