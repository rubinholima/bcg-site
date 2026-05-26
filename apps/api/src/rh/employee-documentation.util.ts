import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { EmployeeAddressDto } from './dto/employee-address.dto';

export function normalizeEmployeeAddress(
  address: EmployeeAddressDto | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!address || typeof address !== 'object') return Prisma.JsonNull;
  const normalized = {
    street: cadastroUpper(address.street) ?? undefined,
    number: cadastroUpper(address.number) ?? undefined,
    complement: cadastroUpper(address.complement) ?? undefined,
    neighborhood: cadastroUpper(address.neighborhood) ?? undefined,
    city: cadastroUpper(address.city) ?? undefined,
    state: cadastroUpper(address.state) ?? undefined,
    zipCode: cadastroUpper(address.zipCode) ?? undefined,
  };
  const hasValue = Object.values(normalized).some((v) => v != null && String(v).trim() !== '');
  return hasValue ? (normalized as Prisma.InputJsonValue) : Prisma.JsonNull;
}

export function employeeDocumentationPatch(dto: {
  address?: EmployeeAddressDto | null;
  pisNumber?: string | null;
  voterTitle?: string | null;
  ctpsUrl?: string | null;
  pixKey?: string | null;
  admissionMedicalExamDate?: string | null;
  admissionMedicalExamFileUrl?: string | null;
  dismissalMedicalExamDate?: string | null;
  dismissalMedicalExamFileUrl?: string | null;
  hasMinorChildren?: boolean;
}): Prisma.EmployeeUpdateInput {
  const patch: Prisma.EmployeeUpdateInput = {};

  if (dto.address !== undefined) {
    patch.address = normalizeEmployeeAddress(dto.address ?? undefined);
  }
  if (dto.pisNumber !== undefined) patch.pisNumber = cadastroUpper(dto.pisNumber);
  if (dto.voterTitle !== undefined) patch.voterTitle = cadastroUpper(dto.voterTitle);
  if (dto.ctpsUrl !== undefined) patch.ctpsUrl = dto.ctpsUrl?.trim() || null;
  if (dto.pixKey !== undefined) patch.pixKey = dto.pixKey?.trim() || null;
  if (dto.admissionMedicalExamDate !== undefined) {
    patch.admissionMedicalExamDate = dto.admissionMedicalExamDate
      ? new Date(dto.admissionMedicalExamDate)
      : null;
  }
  if (dto.admissionMedicalExamFileUrl !== undefined) {
    patch.admissionMedicalExamFileUrl = dto.admissionMedicalExamFileUrl?.trim() || null;
  }
  if (dto.dismissalMedicalExamDate !== undefined) {
    patch.dismissalMedicalExamDate = dto.dismissalMedicalExamDate
      ? new Date(dto.dismissalMedicalExamDate)
      : null;
  }
  if (dto.dismissalMedicalExamFileUrl !== undefined) {
    patch.dismissalMedicalExamFileUrl = dto.dismissalMedicalExamFileUrl?.trim() || null;
  }
  if (dto.hasMinorChildren !== undefined) patch.hasMinorChildren = dto.hasMinorChildren;

  return patch;
}

export function employeeDocumentationCreate(dto: {
  address?: EmployeeAddressDto | null;
  pisNumber?: string | null;
  voterTitle?: string | null;
  ctpsUrl?: string | null;
  pixKey?: string | null;
  admissionMedicalExamDate?: string | null;
  admissionMedicalExamFileUrl?: string | null;
  dismissalMedicalExamDate?: string | null;
  dismissalMedicalExamFileUrl?: string | null;
  hasMinorChildren?: boolean;
}) {
  return {
    address: normalizeEmployeeAddress(dto.address ?? undefined),
    pisNumber: cadastroUpper(dto.pisNumber),
    voterTitle: cadastroUpper(dto.voterTitle),
    ctpsUrl: dto.ctpsUrl?.trim() || null,
    pixKey: dto.pixKey?.trim() || null,
    admissionMedicalExamDate: dto.admissionMedicalExamDate
      ? new Date(dto.admissionMedicalExamDate)
      : null,
    admissionMedicalExamFileUrl: dto.admissionMedicalExamFileUrl?.trim() || null,
    dismissalMedicalExamDate: dto.dismissalMedicalExamDate
      ? new Date(dto.dismissalMedicalExamDate)
      : null,
    dismissalMedicalExamFileUrl: dto.dismissalMedicalExamFileUrl?.trim() || null,
    hasMinorChildren: dto.hasMinorChildren ?? false,
  };
}

export function normalizeDependentName(name: string): string {
  return cadastroUpperRequired(name);
}
