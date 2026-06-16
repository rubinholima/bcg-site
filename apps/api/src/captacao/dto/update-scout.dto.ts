export class UpdateScoutDto {
  technicalStaffId?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  regions?: string[];
  categories?: string[];
  specialties?: string[];
  licenseInfo?: string;
  active?: boolean;
  notes?: string;
}
