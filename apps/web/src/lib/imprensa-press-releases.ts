/** Release de jogo/evento — ordenado por data (mais recente primeiro). */
export interface ImprensaPressReleaseItem {
  id: string;
  date: string;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
}

export function sortPressReleasesByDate(items: ImprensaPressReleaseItem[]): ImprensaPressReleaseItem[] {
  return [...items].sort((a, b) => {
    const da = a.date?.trim() || "0000-00-00";
    const db = b.date?.trim() || "0000-00-00";
    return db.localeCompare(da);
  });
}

export function parsePressReleasesFromConfig(
  config: Record<string, unknown> | null | undefined,
): ImprensaPressReleaseItem[] {
  if (!config) return [];
  const raw = config.imprensaPressReleases;
  if (Array.isArray(raw) && raw.length > 0) {
    const items = raw
      .filter((x): x is ImprensaPressReleaseItem => {
        if (!x || typeof x !== "object") return false;
        const o = x as ImprensaPressReleaseItem;
        return typeof o.id === "string";
      })
      .map((o) => ({
        id: o.id,
        date: typeof o.date === "string" ? o.date : "",
        titlePt: typeof o.titlePt === "string" ? o.titlePt : "",
        titleEn: typeof o.titleEn === "string" ? o.titleEn : "",
        bodyPt: typeof o.bodyPt === "string" ? o.bodyPt : "",
        bodyEn: typeof o.bodyEn === "string" ? o.bodyEn : "",
      }));
    return sortPressReleasesByDate(items);
  }
  const titlePt = (config.imprensaUltimoJogoTituloPt as string)?.trim();
  const bodyPt = (config.imprensaUltimoJogoReleasePt as string)?.trim();
  if (!titlePt && !bodyPt) return [];
  return sortPressReleasesByDate([
    {
      id: "legacy-ultimo-jogo",
      date: (config.imprensaUltimoJogoData as string)?.trim() || "",
      titlePt: titlePt || "",
      titleEn: (config.imprensaUltimoJogoTituloEn as string)?.trim() || "",
      bodyPt: bodyPt || "",
      bodyEn: (config.imprensaUltimoJogoReleaseEn as string)?.trim() || "",
    },
  ]);
}

export function syncLegacyUltimoJogoFields(
  config: Record<string, unknown>,
  releases: ImprensaPressReleaseItem[],
): Record<string, unknown> {
  const sorted = sortPressReleasesByDate(releases);
  const latest = sorted[0];
  const next: Record<string, unknown> = { ...config, imprensaPressReleases: sorted };
  if (latest) {
    next.imprensaUltimoJogoData = latest.date || undefined;
    next.imprensaUltimoJogoTituloPt = latest.titlePt || undefined;
    next.imprensaUltimoJogoTituloEn = latest.titleEn || undefined;
    next.imprensaUltimoJogoReleasePt = latest.bodyPt || undefined;
    next.imprensaUltimoJogoReleaseEn = latest.bodyEn || undefined;
  } else {
    delete next.imprensaUltimoJogoData;
    delete next.imprensaUltimoJogoTituloPt;
    delete next.imprensaUltimoJogoTituloEn;
    delete next.imprensaUltimoJogoReleasePt;
    delete next.imprensaUltimoJogoReleaseEn;
  }
  return next;
}

export function formatPressReleaseDate(date: string, lang: "pt" | "en"): string {
  if (!date?.trim()) return lang === "pt" ? "Sem data" : "No date";
  try {
    return new Date(date + "T12:00:00").toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}
