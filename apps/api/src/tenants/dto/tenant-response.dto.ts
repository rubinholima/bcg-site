export class TenantResponseDto {
  id: string;
  name: string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}
