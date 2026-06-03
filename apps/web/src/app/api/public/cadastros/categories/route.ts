import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";
import { FIXTURE_CATEGORIES_FALLBACK } from "@/lib/fixture-categories";

/**
 * GET /api/public/cadastros/categories
 * Cadastro central de categorias (para validação Google Sheets, site, etc.)
 */
export async function GET() {
  try {
    const res = await fetch(buildBackendUrl("/fixture-categories?active=1"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data)
        ? data.map((c: { value: string; labelPT: string; labelEN: string }) => ({
            value: c.value,
            labelPT: c.labelPT,
            labelEN: c.labelEN,
          }))
        : [];
      if (items.length > 0) {
        return NextResponse.json({ items });
      }
    }
  } catch {
    /* fallback abaixo */
  }

  const categories = FIXTURE_CATEGORIES_FALLBACK.map((c) => ({
    value: c.value,
    labelPT: c.labelPT,
    labelEN: c.labelEN,
  }));
  return NextResponse.json({ items: categories });
}
