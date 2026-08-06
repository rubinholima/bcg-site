"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export {
  formatTravelCategoriesDisplay,
  parseTravelCategoriesFromApi,
  travelCategoriesPayload,
} from "@/lib/travel-categories-utils";

interface TravelCategoryOption {
  value: string;
  labelPT: string;
  labelEN: string;
}

interface TravelCategoriesFieldProps {
  isHomeMatch?: boolean;
  categoriesForDropdown: readonly TravelCategoryOption[];
  multiMode: boolean;
  onMultiModeChange: (v: boolean) => void;
  singleCategory: string;
  onSingleCategoryChange: (v: string) => void;
  selectedCategories: string[];
  onSelectedCategoriesChange: (v: string[]) => void;
}

export function TravelCategoriesField({
  isHomeMatch = false,
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
        {isHomeMatch
          ? "Jogo com várias categorias (ex.: Sub-15 + Sub-17)"
          : "Viagem com várias categorias (ex.: Sub-15 + Sub-17)"}
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
                {c.labelPT}
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
              {c.labelPT}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
