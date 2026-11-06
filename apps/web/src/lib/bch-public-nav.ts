export function bchPublicNavLinks(lang: "pt" | "en", basePath: string) {
  const q = lang === "en" ? "?lang=en" : "";
  const root =
    basePath === "" ? (q ? `/${q}` : "/") : `${basePath.replace(/\/$/, "")}${q}`;
  const eventsHref = basePath === "" ? `/events${q}` : `${basePath.replace(/\/$/, "")}/events${q}`;
  const ticketsHref = basePath === "" ? `/my-tickets${q}` : `${basePath.replace(/\/$/, "")}/my-tickets${q}`;
  return [
    { label: lang === "pt" ? "O espaço" : "The venue", href: `${root}#o-espaco` },
    { label: lang === "pt" ? "Galeria" : "Gallery", href: `${root}#galeria` },
    { label: lang === "pt" ? "Eventos" : "Events", href: eventsHref },
    { label: lang === "pt" ? "Alugar" : "Book", href: `${root}#alugar` },
    { label: lang === "pt" ? "Meus ingressos" : "My tickets", href: ticketsHref },
  ];
}
