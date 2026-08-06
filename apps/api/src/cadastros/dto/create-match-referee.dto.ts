export class CreateMatchRefereeDto {
  name!: string;
  photoUrl?: string;
  federation?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active?: boolean;
}
