export function bchPublicNavLinks(lang: "pt" | "en", basePath: string) {
  const q = lang === "en" ? "?lang=en" : "";
  return [
    { label: lang === "pt" ? "Eventos" : "Events", href: `${basePath}/events${q}` },
    { label: lang === "pt" ? "Meus ingressos" : "My tickets", href: `${basePath}/my-tickets${q}` },
  ];
}
