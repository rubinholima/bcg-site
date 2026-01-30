export interface Tenant {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  kindId: string;
  kind: {
    id: string;
    name: string;
  };
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
