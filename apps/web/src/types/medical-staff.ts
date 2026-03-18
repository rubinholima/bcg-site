export interface MedicalStaff {
  id: string;
  tenantId: string | null;
  tenant?: { id: string; name: string; slug?: string } | null;
  name: string;
  role: string;
  crmCoren?: string | null;
  specialty?: string | null;
  photoUrl?: string | null;
  birthDate?: string | null;
  cpf?: string | null;
  rg?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
