"use client";

import type { CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ModuleTitleGradientFieldsProps {
  gradientStart?: string;
  gradientEnd?: string;
  onGradientStart: (value: string) => void;
  onGradientEnd: (value: string) => void;
  compact?: boolean;
}

/** Cores do gradiente do SectionTitle — global e por módulo dentro de seção colunas. */
export function ModuleTitleGradientFields({
  gradientStart,
  gradientEnd,
  onGradientStart,
  onGradientEnd,
  compact = false,
}: ModuleTitleGradientFieldsProps) {
  return (
    <div className={`space-y-2 ${compact ? "" : "rounded-lg border border-border/60 bg-muted/10 p-2"}`}>
      {!compact ? (
        <p className="text-[11px] text-muted-foreground">
          Gradiente do título no site. Deixe vazio para o padrão (âmbar/branco).
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Cor inicial do título</Label>
          <div className="flex gap-1.5">
            <input
              type="color"
              className="h-8 w-10 cursor-pointer rounded border border-input bg-background"
              value={gradientStart?.trim() || "#fcd34d"}
              onChange={(e) => onGradientStart(e.target.value)}
            />
            <Input
              placeholder="#fcd34d"
              className="h-8 min-w-0 flex-1 text-foreground"
              value={gradientStart ?? ""}
              onChange={(e) => onGradientStart(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cor final do título</Label>
          <div className="flex gap-1.5">
            <input
              type="color"
              className="h-8 w-10 cursor-pointer rounded border border-input bg-background"
              value={gradientEnd?.trim() || "#ffffff"}
              onChange={(e) => onGradientEnd(e.target.value)}
            />
            <Input
              placeholder="#ffffff"
              className="h-8 min-w-0 flex-1 text-foreground"
              value={gradientEnd ?? ""}
              onChange={(e) => onGradientEnd(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function moduleTitleGradientStyle(config?: Record<string, unknown> | null): CSSProperties | undefined {
  const start = (config?.titleGradientStart as string | undefined)?.trim();
  const end = (config?.titleGradientEnd as string | undefined)?.trim();
  if (!start && !end) return undefined;
  return {
    ["--module-title-gradient-start" as string]: start || "#fcd34d",
    ["--module-title-gradient-end" as string]: end || "#ffffff",
  } as CSSProperties;
}

export function moduleHasOwnTitle(m: { config?: Record<string, unknown> | null }): boolean {
  const pt = (m.config?.titlePt as string | undefined)?.trim();
  const en = (m.config?.titleEn as string | undefined)?.trim();
  return Boolean(pt || en);
}
