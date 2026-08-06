export class UpdateMatchRefereeDto {
  name?: string;
  photoUrl?: string | null;
  federation?: string | null;
  licenseNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active?: boolean;
}
