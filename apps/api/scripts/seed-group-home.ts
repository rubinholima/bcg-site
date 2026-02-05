/**
 * Seed: Group Home (conteúdo da Home do Grupo Master).
 * Cria/atualiza apenas o Group com slug "bcg" e seu homeContent (blocos).
 * NÃO cria tenant "bcg" nem Page — a home é do Grupo Master, separada das empresas.
 * Idempotente: rodar 2x não duplica, só atualiza.
 *
 * Rodar (monorepo, a partir da raiz):
 *   pnpm --filter api run seed:group-home
 *
 * Requer: DATABASE_URL em .env (apps/api/.env ou raiz).
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}
const defaultUrl =
  'postgresql://bcg:bcg_password@localhost:5432/bcg_platform?schema=public';
const connectionString = process.env.DATABASE_URL || defaultUrl;

// Prisma 7: usar adapter-pg para instanciar o client
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const GROUP_SLUG = 'bcg';
const GROUP_NAME = 'Boston City Group';

const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80';
const DEFAULT_WHAT =
  'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80';
const DEFAULT_FOUNDER =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80';
const DEFAULT_CTA =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';

function buildBlocks(): Array<{
  id: string;
  type: string;
  sortOrder: number;
  config?: Record<string, unknown>;
}> {
  return [
    {
      id: 'header',
      type: 'header',
      sortOrder: 0,
      config: {
        backgroundColor: '#18181b',
        headerTextColor: '#ffffff',
        headerLinks: [
          { label: 'Clubes', href: '#clubs' },
          { label: 'Empresas', href: '#companies' },
          { label: 'Contato', href: '#contact' },
        ],
      },
    },
    {
      id: 'hero',
      type: 'hero',
      sortOrder: 1,
      config: {
        titlePt: 'O hub que conecta clubes e empresas em uma única operação.',
        titleEn:
          'The hub connecting clubs and companies under one operating standard.',
        bodyPt:
          'O Boston City Group organiza marcas esportivas e negócios sob um padrão comum: identidade, comunicação, governança e execução — com sites por subdomínio e gestão centralizada no dashboard.',
        bodyEn:
          'Boston City Group brings sports brands and businesses into one structure: identity, communication, governance, and execution — with subdomain websites and centralized management through the dashboard.',
        heroSlides: [{ url: DEFAULT_HERO, titlePt: '', titleEn: '' }],
        heroCarouselEffect: 'fade',
        heroCarouselIntervalSeconds: 10,
        backgroundOverlayOpacity: 0.75,
        ctaClubsPt: 'Explorar Clubes',
        ctaCompaniesPt: 'Explorar Empresas',
        ctaClubsEn: 'Explore Clubs',
        ctaCompaniesEn: 'Explore Companies',
      },
    },
    {
      id: 'highlights',
      type: 'highlights',
      sortOrder: 2,
      config: {
        titlePt: 'Destaques',
        titleEn: 'Highlights',
        highlightsPt: [
          'Gestão multi-marca, um padrão',
          'Esporte + negócios + mídia no mesmo ecossistema',
          'Plataforma centralizada para escala',
        ],
        highlightsEn: [
          'Multi-brand management, one standard',
          'Sports + business + media in one ecosystem',
          'Centralized platform built to scale',
        ],
      },
    },
    {
      id: 'what',
      type: 'what',
      sortOrder: 3,
      config: {
        titlePt: 'Construímos ecossistemas que crescem com consistência.',
        titleEn: 'We build ecosystems that scale with consistency.',
        bodyPt:
          'Do campo ao escritório, o foco é simples: estruturar operações, fortalecer marcas e criar sistemas repetíveis que sustentam crescimento.',
        bodyEn:
          'From the pitch to the boardroom, our focus is simple: structure operations, strengthen brands, and build repeatable systems that sustain growth.',
        imageUrl: DEFAULT_WHAT,
        cardsPt: [
          {
            title: 'Operação de Clubes',
            body: 'Estratégia, identidade, calendário, elenco, conteúdo e matchday.',
          },
          {
            title: 'Mídia & Comunicação',
            body: 'Storytelling, produção e distribuição de conteúdo em escala.',
          },
          {
            title: 'Portfólio de Negócios',
            body: 'Unidades organizadas por segmento com padrão de grupo.',
          },
          {
            title: 'Plataforma de Tecnologia',
            body: 'Um hub para páginas, módulos, temas e publicação.',
          },
        ],
        cardsEn: [
          {
            title: 'Club Operations',
            body: 'Strategy, identity, fixtures, squad, content, and matchday.',
          },
          {
            title: 'Media & Communication',
            body: 'Storytelling, production, and distribution at scale.',
          },
          {
            title: 'Business Portfolio',
            body: 'Segment-based units under a unified group standard.',
          },
          {
            title: 'Technology Platform',
            body: 'A hub for pages, modules, themes, and publishing.',
          },
        ],
      },
    },
    {
      id: 'clubs',
      type: 'clubs',
      sortOrder: 4,
      config: {
        titlePt: 'Nossos Clubes',
        titleEn: 'Our Clubs',
        bodyPt:
          'Cada clube mantém sua identidade — e ganha estrutura para evoluir com padrão de grupo.',
        bodyEn:
          'Each club keeps its identity — and gains the structure to evolve under a group standard.',
      },
    },
    {
      id: 'companies',
      type: 'companies',
      sortOrder: 5,
      config: {
        titlePt: 'Nossas Empresas',
        titleEn: 'Our Companies',
        bodyPt:
          'Um portfólio operado por segmentos — com clareza, organização e execução de longo prazo.',
        bodyEn:
          'A segment-based portfolio — built for clarity, organization, and long-term execution.',
      },
    },
    {
      id: 'founder',
      type: 'founder',
      sortOrder: 6,
      config: {
        titlePt: 'História do Fundador: Renato Valentim',
        titleEn: 'Founder Story: Renato Valentim',
        bodyPt:
          'Renato Valentim fundou o Boston City FC em abril de 2015. Materiais públicos do clube o descrevem como empreendedor do setor imobiliário e associado ao grupo de restaurantes Tavern in the Square. Sua visão é unir padrão profissional de organização com a paixão pelo futebol — construindo clubes e empresas que crescem sem perder identidade.',
        bodyEn:
          'Renato Valentim founded Boston City FC in April 2015. Public club materials describe him as a real estate entrepreneur and associated with the Tavern in the Square restaurant group. His vision is to combine professional operating standards with the passion of football — building clubs and companies that scale without losing identity.',
        imageUrl: DEFAULT_FOUNDER,
        bulletsPt: [
          'Fundador do Boston City FC (2015).',
          'Empreendedor do setor imobiliário.',
          'Associado ao Tavern in the Square.',
        ],
        bulletsEn: [
          'Founder of Boston City FC (2015).',
          'Real estate entrepreneur.',
          'Associated with Tavern in the Square.',
        ],
        quotePt: 'Escalar sem perder identidade.',
        quoteEn: 'Scale without losing identity.',
      },
    },
    {
      id: 'how',
      type: 'how',
      sortOrder: 7,
      config: {
        titlePt: 'Um hub. Várias marcas. Um padrão.',
        titleEn: 'One hub. Many brands. One standard.',
        bodyPt:
          'O BostonCityGroup.biz é o hub central. A partir dele, cada marca pode ter um site próprio por subdomínio, identidade visual (cores, fontes, layout), módulos por nicho (futebol primeiro; outros segmentos depois) e gestão centralizada no dashboard.',
        bodyEn:
          'BostonCityGroup.biz is the central hub. From here, each brand can have a subdomain website, a custom visual identity (colors, fonts, layout), modules by niche (football first; other segments next), and centralized management through the dashboard.',
        bulletsPt: [
          'Sites por subdomínio',
          'Identidade visual por marca',
          'Módulos por nicho',
          'Gestão central no dashboard',
        ],
        bulletsEn: [
          'Sites by subdomain',
          'Brand identity per unit',
          'Modules by niche',
          'Centralized management',
        ],
      },
    },
    {
      id: 'cta',
      type: 'cta',
      sortOrder: 8,
      config: {
        titlePt: 'Parcerias, mídia e oportunidades',
        titleEn: 'Partnerships, media, and opportunities',
        bodyPt:
          'Fale com o Boston City Group para parcerias, projetos de mídia e novas iniciativas.',
        bodyEn:
          'Connect with Boston City Group for partnerships, media projects, and new ventures.',
        backgroundImage: DEFAULT_CTA,
        backgroundOverlayOpacity: 0.75,
      },
    },
    {
      id: 'footer',
      type: 'footer',
      sortOrder: 9,
      config: {
        footerText: 'Boston City Group',
        footerLinks: [
          { label: 'Clubes', href: '#clubs' },
          { label: 'Empresas', href: '#companies' },
          { label: 'Contato', href: '#contact' },
        ],
        footerTextColor: '#71717a',
      },
    },
  ];
}

async function main() {
  const content = { blocks: buildBlocks() };

  const group = await prisma.group.upsert({
    where: { slug: GROUP_SLUG },
    create: {
      name: GROUP_NAME,
      slug: GROUP_SLUG,
      homeContent: content as object,
    },
    update: {
      name: GROUP_NAME,
      homeContent: content as object,
    },
  });

  console.log('Group Home seeded successfully (Group id:', group.id, ')');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
