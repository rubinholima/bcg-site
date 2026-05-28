"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_FONT_PRESETS, fontPresetIdFromValue, pageFontPresetsByCategory } from "@/lib/page-fonts";

interface FontFamilyFieldProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  /** Quando true, inclui opção “Padrão da página”. */
  allowInherit?: boolean;
  inheritLabel?: string;
  className?: string;
}

export function FontFamilyField({
  id,
  label = "Fonte",
  value,
  onChange,
  allowInherit = false,
  inheritLabel = "Padrão da página",
  className,
}: FontFamilyFieldProps) {
  const presetId = useMemo(() => fontPresetIdFromValue(value), [value]);
  const [customMode, setCustomMode] = useState(presetId === "custom");
  const groups = useMemo(() => pageFontPresetsByCategory(), []);

  const selectValue = allowInherit && !value?.trim() ? "inherit" : customMode ? "custom" : presetId;

  const selectedLabel =
    presetId === "custom"
      ? "Personalizada"
      : PAGE_FONT_PRESETS.find((p) => p.id === presetId)?.label ?? "Escolher fonte";

  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === "inherit") {
            setCustomMode(false);
            onChange(undefined);
            return;
          }
          if (v === "custom") {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          const preset = PAGE_FONT_PRESETS.find((p) => p.id === v);
          onChange(preset?.value || undefined);
        }}
      >
        <SelectTrigger id={id} className="min-h-[44px] w-full max-w-md">
          <SelectValue placeholder="Escolher fonte">
            <span style={{ fontFamily: value || undefined }}>{selectedLabel}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[min(420px,70vh)]">
          {allowInherit ? (
            <SelectGroup>
              <SelectItem value="inherit">{inheritLabel}</SelectItem>
            </SelectGroup>
          ) : null}
          {groups.map((group) => (
            <SelectGroup key={group.category}>
              <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </SelectLabel>
              {group.presets.map((p) => (
                <SelectItem key={p.id} value={p.id} className="py-2.5">
                  <span className="text-sm leading-tight" style={{ fontFamily: p.value }}>
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectGroup>
            <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outras
            </SelectLabel>
            <SelectItem value="custom">Personalizada…</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {(customMode || presetId === "custom") && (
        <Input
          type="text"
          placeholder='Ex.: "Inter", system-ui ou Georgia, serif'
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          className="text-foreground"
          style={{ fontFamily: value || undefined }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Mais de {PAGE_FONT_PRESETS.length} fontes — preview no menu. Global vale para a página; aqui sobrescreve só neste módulo.
      </p>
    </div>
  );
}
