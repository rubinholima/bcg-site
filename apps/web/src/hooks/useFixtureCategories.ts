"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  FIXTURE_CATEGORIES_FALLBACK,
  mapApiFixtureCategory,
  type FixtureCategoryItem,
} from "@/lib/fixture-categories";

let cachedActive: FixtureCategoryItem[] | null = null;
let inflight: Promise<FixtureCategoryItem[]> | null = null;

async function loadActiveCategories(): Promise<FixtureCategoryItem[]> {
  if (cachedActive) return cachedActive;
  if (inflight) return inflight;
  inflight = api
    .get<Array<{ id: string; value: string; labelPT: string; labelEN: string; sortOrder?: number; active?: boolean }>>(
      "/fixture-categories?active=1",
    )
    .then(({ data }) => {
      const list = Array.isArray(data) ? data.map(mapApiFixtureCategory) : [];
      cachedActive = list.length > 0 ? list : [...FIXTURE_CATEGORIES_FALLBACK];
      return cachedActive;
    })
    .catch(() => {
      cachedActive = [...FIXTURE_CATEGORIES_FALLBACK];
      return cachedActive;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateFixtureCategoriesCache() {
  cachedActive = null;
}

/** Cadastro central de categorias — usado em selects/filtros do dashboard. */
export function useFixtureCategories(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly !== false;
  const [categories, setCategories] = useState<FixtureCategoryItem[]>(
    cachedActive ?? [...FIXTURE_CATEGORIES_FALLBACK],
  );
  const [loading, setLoading] = useState(!cachedActive);

  const reload = useCallback(async () => {
    invalidateFixtureCategoriesCache();
    setLoading(true);
    const list = await loadActiveCategories();
    setCategories(activeOnly ? list.filter((c) => c.active !== false) : list);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => {
    let cancelled = false;
    void loadActiveCategories().then((list) => {
      if (cancelled) return;
      setCategories(activeOnly ? list.filter((c) => c.active !== false) : list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOnly]);

  return { categories, loading, reload };
}
