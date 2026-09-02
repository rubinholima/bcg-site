"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { FixtureCategoryItem } from "@/lib/fixture-categories";
import type { TenantOption } from "@/lib/futebol-executive-types";

export function ExecutiveTopBar({
  tenants,
  categories,
  tenantId,
  category,
  periodDays,
  generatedAt,
  loading,
  onTenantChange,
  onCategoryChange,
  onPeriodChange,
  onRefresh,
}: {
  tenants: TenantOption[];
  categories: FixtureCategoryItem[];
  tenantId: string;
  category: string;
  periodDays: number;
  generatedAt: string | null;
  loading: boolean;
  onTenantChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onPeriodChange: (v: number) => void;
  onRefresh: () => void;
}) {
  const refreshLabel = generatedAt
    ? `Atualizado ${new Date(generatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div className="flex flex-col gap-2 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">
          Visão estratégica e operacional do futebol
        </p>
        {refreshLabel ? (
          <p className="text-[11px] text-muted-foreground/70">{refreshLabel}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tenants.length > 1 ? (
          <NativeSelect
            value={tenantId}
            onChange={(e) => onTenantChange(e.target.value)}
            className="h-8 min-w-[120px] max-w-[160px] px-2 text-xs"
          >
            <option value="">Clube</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
        <NativeSelect
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-8 min-w-[100px] max-w-[130px] px-2 text-xs"
        >
          <option value="">Categoria</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.labelPT}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={String(periodDays)}
          onChange={(e) => onPeriodChange(Number(e.target.value))}
          className="h-8 min-w-[88px] max-w-[100px] px-2 text-xs"
        >
          <option value="7">7 dias</option>
          <option value="14">14 dias</option>
          <option value="30">30 dias</option>
        </NativeSelect>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5 hidden sm:inline">Atualizar</span>
        </Button>
      </div>
    </div>
  );
}
