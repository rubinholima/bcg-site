export interface Tenant {
  id: string;
  name: string;
  tradeName: string | null;
  slug: string;
  location: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  kindId: string;
  kind: {
    id: string;
    name: string;
  };
  logoUrl: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
  sofascoreTeamId: string | null;
  footballDataTeamId: string | null;
  apiFutebolTeamId: string | null;
  categories: string[] | null;
  /** Credenciais Omie salvas (sem expor segredos) */
  omieIntegrationConfigured?: boolean;
  createdAt: string;
  updatedAt: string;
}
