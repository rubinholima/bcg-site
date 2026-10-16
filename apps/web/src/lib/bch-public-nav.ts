export function bchPublicNavLinks(lang: "pt" | "en", basePath: string) {
  const q = lang === "en" ? "?lang=en" : "";
  return [
    { label: lang === "pt" ? "O espaço" : "The venue", href: `${basePath}${q}#o-espaco` },
    { label: lang === "pt" ? "Galeria" : "Gallery", href: `${basePath}${q}#galeria` },
    { label: lang === "pt" ? "Eventos" : "Events", href: `${basePath}/events${q}` },
    { label: lang === "pt" ? "Alugar" : "Book", href: `${basePath}${q}#alugar` },
    { label: lang === "pt" ? "Meus ingressos" : "My tickets", href: `${basePath}/my-tickets${q}` },
  ];
}
