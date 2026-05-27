import { Prisma } from '@prisma/client';

/**
 * Colaborador com convite de cadastro ainda não aprovado (null, pending ou rejected)
 * não aparece nas listas RH — só após reviewStatus === 'approved' ou sem convite.
 */
export const employeeVisibleInRhListFilter: Prisma.EmployeeWhereInput = {
  NOT: {
    registrationInvites: {
      some: {
        reviewStatus: { not: 'approved' },
      },
    },
  },
};

export function isEmployeeFootballLinkRelevant(type: string | null | undefined): boolean {
  return type?.trim() === 'athlete';
}
