export interface PortfolioLocationDto {
  city?: string;
  state?: string;
  country?: string;
}

export interface PortfolioItemDto {
  id: string;
  type: 'club' | 'company';
  name: string;
  slug: string;
  shortDescription?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: PortfolioLocationDto | null;
  /** Endereço completo (vem do Tenant/Group). */
  address?: string | null;
  /** Nome do contato. */
  contactName?: string | null;
  /** Telefone do contato. */
  contactPhone?: string | null;
  segment?: string | null;
  subdomain?: string | null;
  isActive: boolean;
}
