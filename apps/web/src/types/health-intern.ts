export type HealthIntern = {
  id: string;
  name: string;
  area: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  registry?: string | null;
  bio?: string | null;
  notes?: string | null;
  tenantId?: string | null;
  supervisorId?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  tenant?: { id: string; name: string; slug?: string | null } | null;
  supervisor?: { id: string; name: string } | null;
};
