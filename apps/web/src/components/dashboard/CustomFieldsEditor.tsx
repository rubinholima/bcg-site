"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESERVED_KEYS = new Set([
  "titlePt",
  "titleEn",
  "bodyPt",
  "bodyEn",
  "backgroundColor",
  "backgroundOverlayOpacity",
  "backgroundImage",
  "titleGradientStart",
  "titleGradientEnd",
  "visible",
]);

function tryParseValue(val: string): string | number | boolean | unknown {
  const t = val.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  try {
    return JSON.parse(t);
  } catch {
    return val;
  }
}

function formatValueForInput(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

interface CustomFieldsEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  reservedKeys?: Set<string>;
  disabled?: boolean;
}

export function CustomFieldsEditor({
  config,
  onChange,
  reservedKeys = RESERVED_KEYS,
  disabled = false,
}: CustomFieldsEditorProps) {
  const entries = Object.entries(config).filter(
    ([k]) => !reservedKeys.has(k) && !k.startsWith("_"),
  );

  const updateKey = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey) return;
    const next = { ...config };
    delete next[oldKey];
    next[newKey.trim()] = config[oldKey];
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    const parsed = tryParseValue(value);
    onChange({ ...config, [key]: parsed });
  };

  const remove = (key: string) => {
    const next = { ...config };
    delete next[key];
    onChange(next);
  };

  const add = () => {
    onChange({ ...config, "novoCampo": "" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">
          Campos adicionais (chave = valor). Adicione ou altere campos sem ficar preso aos pré-definidos.
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar campo
        </Button>
      </div>
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <Input
              value={key}
              onChange={(e) => updateKey(key, e.target.value)}
              placeholder="nomeDoCampo"
              className="font-mono text-sm"
              disabled={disabled}
            />
            <Input
              value={formatValueForInput(value)}
              onChange={(e) => updateValue(key, e.target.value)}
              placeholder="valor (texto, número, true/false ou JSON)"
              className="flex-1 font-mono text-sm"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(key)}
              disabled={disabled}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum campo adicional. Clique em &quot;Adicionar campo&quot; para adicionar chaves personalizadas (ex: urlPlanilha, maxItens, mostrarEscudo).
          </p>
        )}
      </div>
    </div>
  );
}
