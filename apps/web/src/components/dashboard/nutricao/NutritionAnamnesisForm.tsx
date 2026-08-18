"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NUTRITION_ANAMNESIS_SECTIONS,
  type NutritionAnamnesisData,
  type NutritionAnamnesisFieldKey,
} from "@/lib/nutricao-anamnesis";

export function NutritionAnamnesisForm({
  value,
  onChange,
}: {
  value: NutritionAnamnesisData;
  onChange: (next: NutritionAnamnesisData) => void;
}) {
  const set = (key: NutritionAnamnesisFieldKey, val: string) => {
    onChange({ ...value, [key]: val || undefined });
  };

  return (
    <div className="space-y-6">
      {NUTRITION_ANAMNESIS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <h5 className="text-sm font-semibold text-foreground border-b border-border/60 pb-1">
            {section.title}
          </h5>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => {
              const isTextarea = (field.type ?? "text") === "textarea";
              return (
                <div key={field.key} className={isTextarea ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  {isTextarea ? (
                    <textarea
                      className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      value={value[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      className="text-foreground"
                      value={value[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
