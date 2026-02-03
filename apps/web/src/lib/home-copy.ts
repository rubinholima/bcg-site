export type Lang = "pt" | "en";

export const copy = {
  pt: {
    nav: { home: "Home", clubs: "Clubes", companies: "Empresas", about: "Sobre", contact: "Contato", dashboard: "Dashboard" },
    hero: {
      headline: "O hub que conecta clubes e empresas em uma única operação.",
      subheadline:
        "O Boston City Group organiza marcas esportivas e negócios sob um padrão comum: identidade, comunicação, governança e execução — com sites por subdomínio e gestão centralizada no dashboard.",
      ctaClubs: "Explorar Clubes",
      ctaCompanies: "Explorar Empresas",
    },
    highlights: [
      "Gestão multi-marca, um padrão",
      "Esporte + negócios + mídia no mesmo ecossistema",
      "Plataforma centralizada para escala",
    ],
    what: {
      title: "Construímos ecossistemas que crescem com consistência.",
      body: "Do campo ao escritório, o foco é simples: estruturar operações, fortalecer marcas e criar sistemas repetíveis que sustentam crescimento.",
      cards: [
        { title: "Operação de Clubes", body: "Estratégia, identidade, calendário, elenco, conteúdo e matchday." },
        { title: "Mídia & Comunicação", body: "Storytelling, produção e distribuição de conteúdo em escala." },
        { title: "Portfólio de Negócios", body: "Unidades organizadas por segmento com padrão de grupo." },
        { title: "Plataforma de Tecnologia", body: "Um hub para páginas, módulos, temas e publicação." },
      ],
    },
    clubs: {
      title: "Nossos Clubes",
      subtext: "Cada clube mantém sua identidade — e ganha estrutura para evoluir com padrão de grupo.",
      visitSite: "Visitar Site",
      openProfile: "Ver Perfil",
    },
    companies: {
      title: "Nossas Empresas",
      subtext: "Um portfólio operado por segmentos — com clareza, organização e execução de longo prazo.",
      visitWebsite: "Acessar Site",
      openProfile: "Ver Perfil",
    },
    founder: {
      title: "História do Fundador: Renato Valentim",
      body: "Renato Valentim fundou o Boston City FC em abril de 2015. Materiais públicos do clube o descrevem como empreendedor do setor imobiliário e associado ao grupo de restaurantes Tavern in the Square. Sua visão é unir padrão profissional de organização com a paixão pelo futebol — construindo clubes e empresas que crescem sem perder identidade.",
      bullets: [
        "Fundador do Boston City FC (2015).",
        "Empreendedor do setor imobiliário.",
        "Associado ao Tavern in the Square.",
      ],
      quote: "Escalar sem perder identidade.",
    },
    how: {
      title: "Um hub. Várias marcas. Um padrão.",
      body: "O BostonCityGroup.biz é o hub central. A partir dele, cada marca pode ter um site próprio por subdomínio, identidade visual (cores, fontes, layout), módulos por nicho (futebol primeiro; outros segmentos depois) e gestão centralizada no dashboard.",
      bullets: [
        "Sites por subdomínio",
        "Identidade visual por marca",
        "Módulos por nicho",
        "Gestão central no dashboard",
      ],
    },
    cta: {
      title: "Parcerias, mídia e oportunidades",
      body: "Fale com o Boston City Group para parcerias, projetos de mídia e novas iniciativas.",
      contact: "Contato",
      dashboard: "Acessar Dashboard",
    },
    errorBanner: "Não foi possível carregar o portfólio. Os dados serão exibidos quando a conexão estiver disponível.",
  },
  en: {
    nav: { home: "Home", clubs: "Clubs", companies: "Companies", about: "About", contact: "Contact", dashboard: "Dashboard" },
    hero: {
      headline: "The hub connecting clubs and companies under one operating standard.",
      subheadline:
        "Boston City Group brings sports brands and businesses into one structure: identity, communication, governance, and execution — with subdomain websites and centralized management through the dashboard.",
      ctaClubs: "Explore Clubs",
      ctaCompanies: "Explore Companies",
    },
    highlights: [
      "Multi-brand management, one standard",
      "Sports + business + media in one ecosystem",
      "Centralized platform built to scale",
    ],
    what: {
      title: "We build ecosystems that scale with consistency.",
      body: "From the pitch to the boardroom, our focus is simple: structure operations, strengthen brands, and build repeatable systems that sustain growth.",
      cards: [
        { title: "Club Operations", body: "Strategy, identity, fixtures, squad, content, and matchday." },
        { title: "Media & Communication", body: "Storytelling, production, and distribution at scale." },
        { title: "Business Portfolio", body: "Segment-based units under a unified group standard." },
        { title: "Technology Platform", body: "A hub for pages, modules, themes, and publishing." },
      ],
    },
    clubs: {
      title: "Our Clubs",
      subtext: "Each club keeps its identity — and gains the structure to evolve under a group standard.",
      visitSite: "Visit Site",
      openProfile: "Open Profile",
    },
    companies: {
      title: "Our Companies",
      subtext: "A segment-based portfolio — built for clarity, organization, and long-term execution.",
      visitWebsite: "Visit Website",
      openProfile: "Open Profile",
    },
    founder: {
      title: "Founder Story: Renato Valentim",
      body: "Renato Valentim founded Boston City FC in April 2015. Public club materials describe him as a real estate entrepreneur and associated with the Tavern in the Square restaurant group. His vision is to combine professional operating standards with the passion of football — building clubs and companies that scale without losing identity.",
      bullets: [
        "Founder of Boston City FC (2015).",
        "Real estate entrepreneur.",
        "Associated with Tavern in the Square.",
      ],
      quote: "Scale without losing identity.",
    },
    how: {
      title: "One hub. Many brands. One standard.",
      body: "BostonCityGroup.biz is the central hub. From here, each brand can have a subdomain website, a custom visual identity (colors, fonts, layout), modules by niche (football first; other segments next), and centralized management through the dashboard.",
      bullets: [
        "Sites by subdomain",
        "Brand identity per unit",
        "Modules by niche",
        "Centralized management",
      ],
    },
    cta: {
      title: "Partnerships, media, and opportunities",
      body: "Connect with Boston City Group for partnerships, media projects, and new ventures.",
      contact: "Contact",
      dashboard: "Go to Dashboard",
    },
    errorBanner: "Could not load portfolio. Data will show when the connection is available.",
  },
} as const;
