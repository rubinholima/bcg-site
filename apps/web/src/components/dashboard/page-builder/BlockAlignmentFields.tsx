"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BlockAlignmentFields({
  titleAlign,
  subtitleAlign,
  bodyAlign,
  onTitleAlign,
  onSubtitleAlign,
  onBodyAlign,
  showSubtitle = true,
}: {
  titleAlign?: string;
  subtitleAlign?: string;
  bodyAlign?: string;
  onTitleAlign: (v: "left" | "center" | "right" | undefined) => void;
  onSubtitleAlign?: (v: "left" | "center" | "right" | undefined) => void;
  onBodyAlign?: (v: "left" | "center" | "right" | undefined) => void;
  showSubtitle?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Alinhamento do título</Label>
        <Select value={titleAlign ?? "inherit"} onValueChange={(v) => onTitleAlign(v === "inherit" ? undefined : (v as "left" | "center" | "right"))}>
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Herdar da página</SelectItem>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showSubtitle && onSubtitleAlign ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Alinhamento do subtítulo</Label>
          <Select value={subtitleAlign ?? "inherit"} onValueChange={(v) => onSubtitleAlign(v === "inherit" ? undefined : (v as "left" | "center" | "right"))}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">Herdar</SelectItem>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {onBodyAlign ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Alinhamento do corpo</Label>
          <Select value={bodyAlign ?? "inherit"} onValueChange={(v) => onBodyAlign(v === "inherit" ? undefined : (v as "left" | "center" | "right"))}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">Herdar</SelectItem>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
