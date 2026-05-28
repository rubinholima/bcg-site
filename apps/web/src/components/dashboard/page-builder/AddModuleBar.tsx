"use client";

import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HomeBlockType } from "@/types/home-content";
import {
  getMiddleModuleOptionsForCategory,
  MODULE_TYPE_FILTER_EVENTOS,
  resolveModuleCategoryFromFilter,
  resolveModuleFilterLabel,
  type ModuleCategory,
} from "@/lib/home-content";

interface AddModuleBarProps {
  moduleTypeFilter: string;
  onModuleTypeFilterChange: (value: string) => void;
  onAddModule: (type: HomeBlockType) => void;
  tenantKindOptions?: Array<{ id: string; name: string }>;
  showGeralGroup?: boolean;
}

export function AddModuleBar({
  moduleTypeFilter,
  onModuleTypeFilterChange,
  onAddModule,
  tenantKindOptions = [],
  showGeralGroup = false,
}: AddModuleBarProps) {
  const resolvedCategory = resolveModuleCategoryFromFilter(moduleTypeFilter) as ModuleCategory;
  const resolvedLabel = resolveModuleFilterLabel(moduleTypeFilter);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
        <Plus className="h-4 w-4" />
        Adicionar módulo
      </div>
      {tenantKindOptions.length > 0 ? (
        <Select value={moduleTypeFilter} onValueChange={onModuleTypeFilterChange}>
          <SelectTrigger className="min-h-[44px] w-full sm:w-[200px]">
            <SelectValue placeholder="Tipo de negócio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geral">Geral</SelectItem>
            <SelectItem value={MODULE_TYPE_FILTER_EVENTOS}>Eventos</SelectItem>
            {tenantKindOptions.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select
        value=""
        onValueChange={(value) => {
          if (value) onAddModule(value as HomeBlockType);
        }}
      >
        <SelectTrigger className="min-h-[44px] w-full sm:min-w-[260px] sm:flex-1">
          <SelectValue placeholder="Escolha o tipo de módulo…" />
        </SelectTrigger>
        <SelectContent>
          {showGeralGroup && resolvedCategory !== "geral" ? (
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold text-muted-foreground">Geral</SelectLabel>
              {getMiddleModuleOptionsForCategory("geral").map((opt) => (
                <SelectItem key={opt.type} value={opt.type}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">{resolvedLabel}</SelectLabel>
            {getMiddleModuleOptionsForCategory(resolvedCategory).map((opt) => (
              <SelectItem key={opt.type} value={opt.type}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
