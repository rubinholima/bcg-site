"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
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
import type { PageTheme } from "@/types/page";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { FontFamilyField } from "./FontFamilyField";

interface PageThemePanelProps {
  theme: PageTheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateTheme: (key: keyof PageTheme, value: PageTheme[keyof PageTheme]) => void;
  overlayOpacityDraft: string | null;
  setOverlayOpacityDraft: (value: string | null) => void;
}

export function PageThemePanel({
  theme,
  open,
  onOpenChange,
  updateTheme,
  overlayOpacityDraft,
  setOverlayOpacityDraft,
}: PageThemePanelProps) {
  return (
    <Card className="border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-transparent">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => onOpenChange(!open)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
                Global
              </span>
              Aparência da página
            </CardTitle>
            <CardDescription>
              Fonte, cores e largura padrão — vale para todos os módulos (cada um pode sobrescrever).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 border-violet-500/40"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(!open);
            }}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? "Recolher" : "Expandir"}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Largura do conteúdo</Label>
              <Select
                value={(theme.contentWidth as string) ?? "box"}
                onValueChange={(v) => updateTheme("contentWidth", v as "box" | "full")}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box">Box (centralizado)</SelectItem>
                  <SelectItem value="full">Largura total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alinhamento dos títulos</Label>
              <Select
                value={(theme.titleAlign as string) ?? "left"}
                onValueChange={(v) => updateTheme("titleAlign", v as "left" | "center" | "right")}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Idioma principal</Label>
              <Select
                value={(theme.defaultLang as string) ?? "pt"}
                onValueChange={(v) => updateTheme("defaultLang", v as "pt" | "en")}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <FontFamilyField
            value={(theme.fontFamily as string) ?? ""}
            onChange={(v) => updateTheme("fontFamily", v)}
            label="Fonte padrão da página"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cor de fundo</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                  value={(theme.backgroundColor as string)?.trim() || "#0f0f12"}
                  onChange={(e) => updateTheme("backgroundColor", e.target.value)}
                />
                <Input
                  placeholder="#0f0f12"
                  value={(theme.backgroundColor as string) ?? ""}
                  onChange={(e) => updateTheme("backgroundColor", e.target.value.trim() || undefined)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Imagem de fundo</Label>
              <MediaPicker
                value={(theme.backgroundImage as string) ?? ""}
                onChange={(url) => updateTheme("backgroundImage", url || undefined)}
                sizeKey="backgrounds"
                allowUpload
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Overlay da imagem (0–1)</Label>
              <Input
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
              <Label>Cor do texto</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                  value={(theme.textColor as string)?.trim() || "#fafafa"}
                  onChange={(e) => updateTheme("textColor", e.target.value)}
                />
                <Input
                  placeholder="#fafafa"
                  value={(theme.textColor as string) ?? ""}
                  onChange={(e) => updateTheme("textColor", e.target.value.trim() || undefined)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor de destaque / links</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
                value={(theme.accentColor as string)?.trim() || "#fbbf24"}
                onChange={(e) => updateTheme("accentColor", e.target.value)}
              />
              <Input
                placeholder="#fbbf24"
                className="max-w-xs"
                value={(theme.accentColor as string) ?? ""}
                onChange={(e) => updateTheme("accentColor", e.target.value.trim() || undefined)}
              />
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
