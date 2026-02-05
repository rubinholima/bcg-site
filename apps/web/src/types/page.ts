import type { HomeContentBlock } from "./home-content";

export interface PageContent {
  blocks?: HomeContentBlock[];
}

export interface Page {
  id: string;
  tenantId: string;
  slug: string;
  title: string | null;
  content: PageContent;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
}
