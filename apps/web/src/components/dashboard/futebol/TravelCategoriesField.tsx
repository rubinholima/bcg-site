"use client";

import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TravelCategoryOption {
  value: string;
  labelPT: string;
  labelEN: string;
}

interface TravelCategoriesFieldProps {
  categoriesForDropdown: readonly TravelCategoryOption[];
  multiMode: boolean;
  onMultiModeChange: (v: boolean) => void;
  singleCategory: string;
  onSingleCategoryChange: (v: string) => void;
  selectedCategories: string[];
  onSelectedCategoriesChange: (v: string[]) => void;
}

export function TravelCategoriesField({
  categoriesForDropdown,
  multiMode,
  onMultiModeChange,
  singleCategory,
  onSingleCategoryChange,
  selectedCategories,
  onSelectedCategoriesChange,
}: TravelCategoriesFieldProps) {
  const toggleCat = (value: string, checked: boolean) => {
    if (checked) {
      onSelectedCategoriesChange([...new Set([...selectedCategories, value])]);
    } else {
      onSelectedCategoriesChange(selectedCategories.filter((c) => c !== value));
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
        <Checkbox
          checked={multiMode}
          onCheckedChange={(v) => onMultiModeChange(v === true)}
        />
        Viagem com várias categorias (ex.: Sub-15 + Sub-17)
      </label>

      {!multiMode ? (
        <div className="grid gap-1.5">
          <Label htmlFor="travel-category">Categoria</Label>
          <select
            id="travel-category"
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={singleCategory || ""}
            onChange={(e) => onSingleCategoryChange(e.target.value)}
          >
            <option value="">Todas / não especificada</option>
            {categoriesForDropdown.map((c) => (
              <option key={c.value} value={c.value}>
                {getCategoryLabel(c.value, "pt")}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {categoriesForDropdown.map((c) => (
            <label
              key={c.value}
              className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
            >
              <Checkbox
                checked={selectedCategories.includes(c.value)}
                onCheckedChange={(v) => toggleCat(c.value, v === true)}
              />
              {getCategoryLabel(c.value, "pt")}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function parseTravelCategoriesFromApi(
  category: string | null | undefined,
  categories: unknown,
): { multiMode: boolean; single: string; list: string[] } {
  const list = Array.isArray(categories)
    ? categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  if (list.length > 1) return { multiMode: true, single: "", list };
  if (list.length === 1) return { multiMode: false, single: list[0]!, list: [] };
  return { multiMode: false, single: category ?? "", list: [] };
}

export function travelCategoriesPayload(
  multiMode: boolean,
  singleCategory: string,
  selectedCategories: string[],
): { category?: string; categories?: string[] } {
  if (multiMode && selectedCategories.length > 0) {
    return { categories: selectedCategories };
  }
  if (singleCategory.trim()) return { category: singleCategory.trim() };
  return {};
}

export function formatTravelCategoriesDisplay(
  category: string | null | undefined,
  categories: unknown,
  locale: "pt" | "en" = "pt",
): string {
  const list = Array.isArray(categories)
    ? categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  if (list.length > 1) {
    return list.map((c) => getCategoryLabel(c, locale)).join(" + ");
  }
  if (list.length === 1) return getCategoryLabel(list[0]!, locale);
  if (category) return getCategoryLabel(category, locale);
  return "—";
}
