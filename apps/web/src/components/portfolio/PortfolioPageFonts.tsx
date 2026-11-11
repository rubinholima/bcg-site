"use client";

import { useMemo } from "react";
import type { PageTheme } from "@/types/page";
import { buildGoogleFontsUrlForFamilies, collectFontFamiliesFromTheme } from "@/lib/page-fonts";

export function PortfolioPageFonts({ theme }: { theme?: PageTheme | null }) {
  const href = useMemo(() => {
    const families = collectFontFamiliesFromTheme(theme);
    if (!families.length) return null;
    return buildGoogleFontsUrlForFamilies(families);
  }, [theme]);
  if (!href) return null;
  return <link rel="stylesheet" href={href} />;
}
