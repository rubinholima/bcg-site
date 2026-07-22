"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  INVENTORY_KIND_ORDER,
  INVENTORY_KIND_LABELS,
  type InventoryCategoryRow,
} from "@/lib/inventory-kinds";

export function useInventoryCategories(tenantId?: string) {
  const [categories, setCategories] = useState<InventoryCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<InventoryCategoryRow[]>(`/compras/inventory-categories${qs}`);
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const options = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => ({ slug: c.slug, name: c.name, isSystem: c.isSystem }));
    }
    return INVENTORY_KIND_ORDER.map((slug) => ({
      slug,
      name: INVENTORY_KIND_LABELS[slug] ?? slug,
      isSystem: true,
    }));
  }, [categories]);

  const orderSlugs = useMemo(() => options.map((o) => o.slug), [options]);

  return { categories, options, orderSlugs, loading, reload: load };
}
