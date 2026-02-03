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
  createdAt: Date | string;
  updatedAt: Date | string;
}
