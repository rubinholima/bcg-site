export type BchVenueLang = "pt" | "en";

export const BCH_VENUE_GALLERY = [
  { src: "/bch/gallery/arena-1.jpg", captionPt: "Complexo multiuso — vista geral", captionEn: "Multi-purpose complex — overview" },
  { src: "/bch/gallery/arena-2.jpg", captionPt: "Área de eventos e shows", captionEn: "Events and show area" },
  { src: "/bch/gallery/arena-3.jpg", captionPt: "Estrutura da arena", captionEn: "Arena structure" },
  { src: "/bch/gallery/arena-5.jpg", captionPt: "Espaços de circulação", captionEn: "Circulation areas" },
  { src: "/bch/gallery/arena-8.jpg", captionPt: "Ambientes de apoio", captionEn: "Support areas" },
  { src: "/bch/gallery/arena-10.jpg", captionPt: "Montagem para experiências ao vivo", captionEn: "Live experience setup" },
  { src: "/bch/gallery/arena-14.jpg", captionPt: "Detalhes da infraestrutura", captionEn: "Infrastructure details" },
  { src: "/bch/gallery/arena-18.jpg", captionPt: "Salão e palco", captionEn: "Main hall and stage" },
  { src: "/bch/gallery/arena-21.jpg", captionPt: "Inauguração — Boston City Hall", captionEn: "Opening — Boston City Hall" },
  { src: "/bch/gallery/arena-22.jpg", captionPt: "Operação integrada BCG", captionEn: "Integrated BCG operations" },
] as const;

export const BCH_VENUE_HERO_IMAGE = "/bch/gallery/arena-21.jpg";

/** Embed genérico — Complexo Boston City, Manhuaçu (MG). */
export const BCH_VENUE_MAP_EMBED =
  "https://www.google.com/maps?q=Centro+de+Treinamento+Boston+City+Manhua%C3%A7u+MG&output=embed";

export const BCH_VENUE_INSTAGRAM = "https://www.instagram.com/bostoncityhall/";

export function bchVenueCopy(lang: BchVenueLang) {
  const pt = lang === "pt";
  return {
    heroLead: pt
      ? "Arena multiuso em Manhuaçu (MG) — shows, corporativos, esportes e experiências ao vivo na Zona da Mata mineira."
      : "Multi-purpose arena in Manhuaçu, Brazil — shows, corporate events, sports and live experiences in Minas Gerais.",
    ctaEvents: pt ? "Ver eventos e ingressos" : "Events & tickets",
    ctaRent: pt ? "Alugar o espaço" : "Book the venue",
    ctaTickets: pt ? "Meus ingressos" : "My tickets",
    aboutTitle: pt ? "O Boston City Hall" : "Boston City Hall",
    aboutBody: pt
      ? "O Boston City Hall é o venue oficial do Boston City Group em Manhuaçu, concebido como polo regional de entretenimento e eventos durante todo o ano — não apenas em dias de jogo. O complexo integra gramado sintético certificado FIFA, salão para shows e convenções, camarotes e lounges, área kids, bares, restaurante, telões, estacionamento e ambientes de apoio (vestiários, imprensa, recuperação e operação).\n\nCapacidade estimada de até 12 mil pessoas em jogos e até 30 mil em grandes shows e apresentações, conforme layout. Corporativos, fan fests, transmissões, ativações de marca, festas e formatos híbridos entram no mesmo ecossistema operacional do grupo."
      : "Boston City Hall is Boston City Group's official venue in Manhuaçu, designed as a year-round regional hub for entertainment and events — not only on match days. The complex includes FIFA-certified synthetic turf, a show and convention hall, suites and lounges, kids area, bars, restaurant, large screens, parking and back-of-house areas (locker rooms, press, recovery and operations).\n\nEstimated capacity up to 12,000 for matches and up to 30,000 for major shows and concerts, depending on layout. Corporate events, fan fests, broadcasts, brand activations, parties and hybrid formats run on the same operational ecosystem as the group.",
    stats: [
      { value: "12k", label: pt ? "Capacidade (jogos)" : "Capacity (matches)" },
      { value: "30k", label: pt ? "Grandes shows" : "Major concerts" },
      { value: "2.000+", label: pt ? "m² de área multiuso" : "m² multi-use area" },
      { value: "MG", label: pt ? "Manhuaçu · Zona da Mata" : "Manhuaçu · Minas Gerais" },
    ],
    structureTitle: pt ? "O que tem no complexo" : "What's on site",
    structureItems: [
      { title: pt ? "Gramado FIFA" : "FIFA-grade pitch", body: pt ? "Grama sintética para futebol, treinos e bases que convivem com montagens de evento." : "Synthetic turf for football, training and event setups." },
      { title: pt ? "Palco e salão" : "Stage & main hall", body: pt ? "Shows, convenções e galas com visão ampla e montagem flexível." : "Shows, conventions and galas with flexible staging." },
      { title: pt ? "Camarotes e lounges" : "Suites & lounges", body: pt ? "Hospitality premium, coquetéis e recepções VIP." : "Premium hospitality, cocktails and VIP reception." },
      { title: pt ? "Gastronomia" : "Food & beverage", body: pt ? "Restaurante, bares e cozinha de apoio para eventos." : "Restaurant, bars and event catering support." },
      { title: pt ? "Família" : "Family", body: pt ? "Área kids e circulação pensada para público amplo." : "Kids area and circulation for large crowds." },
      { title: pt ? "Mídia e operação" : "Media & ops", body: pt ? "Telões, imprensa, VAR, vestiários e salas técnicas." : "Screens, press, VAR, locker rooms and technical areas." },
    ],
    spacesTitle: pt ? "Formatos de evento" : "Event formats",
    spaces: [
      {
        title: pt ? "Shows e festivais" : "Shows & festivals",
        body: pt ? "Grandes palcos, público em pé ou misto, operação de bilheteria e entrada digital." : "Large stages, standing or mixed audiences, ticketing and digital entry.",
      },
      {
        title: pt ? "Corporativo e institucional" : "Corporate & institutional",
        body: pt ? "Convenções, lançamentos, plenárias, happy hours e ativações de marca." : "Conventions, launches, plenaries, happy hours and brand activations.",
      },
      {
        title: pt ? "Esportivo e fan experience" : "Sports & fan experience",
        body: pt ? "Jogos, fan fests, transmissões e experiências com torcida." : "Matches, fan fests, broadcasts and supporter experiences.",
      },
      {
        title: pt ? "Social e privado" : "Social & private",
        body: pt ? "Festas, aniversários, casamentos e formatos sob medida (consulte capacidade por ambiente)." : "Parties, birthdays, weddings and bespoke formats (capacity varies by area).",
      },
    ],
    galleryTitle: pt ? "Conheça o espaço" : "Explore the venue",
    galleryCredit: pt ? "Registro da inauguração em Manhuaçu (MG)." : "Opening coverage in Manhuaçu, Brazil.",
    eventsTitle: pt ? "Ingressos — próximos eventos" : "Tickets — upcoming events",
    rentTitle: pt ? "Alugue o Boston City Hall" : "Book Boston City Hall",
    rentLead: pt
      ? "Conte data, formato e número de convidados. Nossa equipe comercial retorna com disponibilidade e proposta."
      : "Share your date, format and guest count. Our team will reply with availability and a proposal.",
    rentSteps: pt
      ? [
          "Envie a solicitação com tipo de evento e data preferida",
          "Analisamos agenda, layout e serviços (AV, gastronomia, produção)",
          "Você recebe proposta comercial detalhada",
          "Confirmado: operamos montagem, evento e desmontagem com você",
        ]
      : [
          "Submit your request with event type and preferred date",
          "We review schedule, layout and services (AV, F&B, production)",
          "You receive a detailed commercial proposal",
          "Once confirmed, we run setup, event and teardown with you",
        ],
    locationTitle: pt ? "Como chegar" : "Getting here",
    locationBody: pt
      ? "Manhuaçu (MG), Zona da Mata mineira — polo regional com acesso rodoviário para cidades do Caparaó e entorno. Estacionamento no complexo."
      : "Manhuaçu, Minas Gerais — regional hub with road access from the Caparaó area. On-site parking.",
    mapOpen: pt ? "Abrir no Google Maps" : "Open in Google Maps",
    instagram: pt ? "Mais fotos no Instagram" : "More photos on Instagram",
    formTitle: pt ? "Solicitar proposta" : "Request a quote",
    sectionEvents: pt ? "Próximos eventos" : "Upcoming events",
    allEvents: pt ? "Ver todos" : "View all",
    emptyEvents: pt ? "Novos eventos serão publicados em breve." : "New events will be published soon.",
    buy: pt ? "Comprar" : "Buy",
    details: pt ? "Detalhes" : "Details",
    footerGroup: "Boston City Group",
  };
}
