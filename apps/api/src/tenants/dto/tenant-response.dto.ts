export class TenantResponseDto {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  kindId: string;
  kind: {
    id: string;
    name: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}
