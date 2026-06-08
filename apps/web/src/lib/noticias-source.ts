/** Nome legível a partir do hostname (ex.: globoesporte.globo.com → Globo Esporte). */
export function hostnameToSourceLabel(hostname: string): string {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  const known: Record<string, string> = {
    "globoesporte.globo.com": "Globo Esporte",
    "ge.globo.com": "Globo Esporte",
    "uol.com.br": "UOL",
    "lance.com.br": "Lance!",
    "terra.com.br": "Terra",
    "instagram.com": "Instagram",
  };
  if (known[host]) return known[host];
  const base = host.split(".")[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function sourceFromNewsLink(link: string | undefined): string | undefined {
  if (!link?.trim()) return undefined;
  try {
    return hostnameToSourceLabel(new URL(link).hostname);
  } catch {
    return undefined;
  }
}

/** Títulos agregados (Google News) costumam terminar com " - Fonte". */
export function sourceFromNewsTitle(title: string | undefined): string | undefined {
  const t = title?.trim() ?? "";
  const dash = t.lastIndexOf(" - ");
  if (dash > 24 && dash < t.length - 2) {
    return t.slice(dash + 3).trim();
  }
  return undefined;
}
