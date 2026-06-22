"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PSYCH_ANAMNESIS_SECTIONS,
  type PsychAnamnesisData,
  type PsychAnamnesisFieldKey,
} from "@/lib/psych-anamnesis";

export function PsychAnamnesisForm({
  value,
  onChange,
}: {
  value: PsychAnamnesisData;
  onChange: (next: PsychAnamnesisData) => void;
}) {
  const set = (key: PsychAnamnesisFieldKey, val: string) => {
    onChange({ ...value, [key]: val || undefined });
  };

  return (
    <div className="space-y-6">
      {PSYCH_ANAMNESIS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <h5 className="text-sm font-semibold text-foreground border-b border-border/60 pb-1">
            {section.title}
          </h5>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => {
              const fieldType = field.type ?? "text";
              if (fieldType === "yesno") {
                const current = value[field.key] as string | undefined;
                return (
                  <div key={field.key} className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {(["sim", "nao"] as const).map((opt) => (
                        <label key={opt} className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name={field.key}
                            checked={current === opt}
                            onChange={() => set(field.key, opt)}
                            className="h-4 w-4"
                          />
                          {opt === "sim" ? "Sim" : "Não"}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
              if (fieldType === "scale") {
                return (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      value={value[field.key] ?? ""}
                      onChange={(e) => set(field.key, e.target.value)}
                    >
                      <option value="">—</option>
                      {["1", "2", "3", "4", "5"].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (fieldType === "textarea") {
                return (
                  <div key={field.key} className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <textarea
                      className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-y"
                      placeholder={field.placeholder}
                      value={(value[field.key] as string) ?? ""}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  </div>
                );
              }
              return (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <Input
                    className="text-foreground"
                    placeholder={field.placeholder}
                    value={(value[field.key] as string) ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
