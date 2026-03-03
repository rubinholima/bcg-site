export interface Group {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  moduleDefaults?: Record<string, Record<string, unknown>> | null;
  createdAt: string;
  updatedAt: string;
}
