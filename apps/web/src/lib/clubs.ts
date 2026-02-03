export type ClubType = "club" | "company";

export interface Club {
  name: string;
  slug: string;
  shortDescription: string;
  type: ClubType;
  logoUrl?: string;
}

export const clubs: Club[] = [
  {
    name: "Boston City FC",
    slug: "bostoncityfc",
    shortDescription: "Clube de futebol profissional do Boston City Group.",
    type: "club",
    logoUrl: undefined,
  },
  {
    name: "Americano FC",
    slug: "americanofc",
    shortDescription: "Tradição e paixão pelo futebol.",
    type: "club",
    logoUrl: undefined,
  },
  {
    name: "Atrium Productions",
    slug: "atriumproductions",
    shortDescription: "Produção de conteúdo e eventos.",
    type: "company",
    logoUrl: undefined,
  },
  {
    name: "Atrium Plus",
    slug: "atriumplus",
    shortDescription: "Plataforma de streaming e entretenimento.",
    type: "company",
    logoUrl: undefined,
  },
];

export const clubSiteBaseUrl = "https://bostoncitygroup.biz";

export function getClubSiteUrl(slug: string): string {
  return `https://${slug}.bostoncitygroup.biz`;
}
