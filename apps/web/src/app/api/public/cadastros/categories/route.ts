import { NextResponse } from "next/server";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";

/**
 * GET /api/public/cadastros/categories
 * Retorna lista de categorias disponíveis (para validação de dados no Google Sheets).
 */
export async function GET() {
  const categories = FIXTURE_CATEGORIES.map((c) => ({
    value: c.value,
    labelPT: c.labelPT,
    labelEN: c.labelEN,
  }));
  return NextResponse.json({ items: categories });
}
