import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';

type EmployeeWithTenant = {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  cpf: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  photoUrl: string | null;
  playerId: string | null;
  tenant: { slug: string };
};

function patchRegistrationProfileRh(
  profile: unknown,
  data: { rhEnrollment?: string; cpf?: string; rg?: string },
): Prisma.InputJsonValue {
  const base =
    profile && typeof profile === 'object' && !Array.isArray(profile)
      ? { ...(profile as Record<string, unknown>) }
      : {};
  const personal =
    base.personal && typeof base.personal === 'object' && !Array.isArray(base.personal)
      ? { ...(base.personal as Record<string, unknown>) }
      : {};
  if (data.rhEnrollment !== undefined) personal.rhEnrollment = data.rhEnrollment;
  if (data.cpf !== undefined) personal.cpf = data.cpf;
  if (data.rg !== undefined) personal.rg = data.rg;
  return { ...base, personal } as Prisma.InputJsonValue;
}

export async function generateEmployeeCode(prisma: PrismaService, tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  const prefix =
    (tenant?.slug ?? 'BCG')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'BCG';

  for (let attempt = 0; attempt < 100; attempt++) {
    const count = await prisma.employee.count({ where: { tenantId } });
    const code = `${prefix}-${String(count + 1 + attempt).padStart(6, '0')}`;
    const exists = await prisma.employee.findFirst({ where: { tenantId, code } });
    if (!exists) return code;
  }
  throw new BadRequestException('Não foi possível gerar matrícula RH');
}

export async function syncPlayerFromEmployee(
  prisma: PrismaService,
  employee: EmployeeWithTenant,
  playerId: string,
): Promise<void> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new NotFoundException('Atleta não encontrado');
  if (player.tenantId !== employee.tenantId) {
    throw new BadRequestException('O atleta pertence a outro clube/empresa');
  }

  const linked = await prisma.employee.findFirst({
    where: { playerId, NOT: { id: employee.id } },
  });
  if (linked) {
    throw new BadRequestException('Este atleta já está vinculado a outro colaborador RH');
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      name: employee.name,
      birthDate: employee.birthDate ? employee.birthDate.toISOString().slice(0, 10) : player.birthDate,
      photoUrl: employee.photoUrl ?? player.photoUrl,
      contactEmail: employee.email ?? player.contactEmail,
      contactPhone: employee.phone ?? player.contactPhone,
      registrationProfile: patchRegistrationProfileRh(player.registrationProfile, {
        rhEnrollment: employee.code ?? undefined,
        cpf: cadastroUpper(employee.cpf) ?? undefined,
        rg: cadastroUpper(employee.rg) ?? undefined,
      }),
    },
  });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { playerId },
  });
}

export async function createPlayerFromEmployee(
  prisma: PrismaService,
  employee: EmployeeWithTenant,
): Promise<{ id: string; name: string }> {
  if (employee.playerId) {
    throw new BadRequestException('Colaborador já possui cadastro de atleta vinculado');
  }

  const player = await prisma.player.create({
    data: {
      tenantId: employee.tenantId,
      name: employee.name,
      birthDate: employee.birthDate ? employee.birthDate.toISOString().slice(0, 10) : null,
      photoUrl: employee.photoUrl,
      contactEmail: employee.email,
      contactPhone: employee.phone,
      registrationProfile: patchRegistrationProfileRh(null, {
        rhEnrollment: employee.code ?? undefined,
        cpf: cadastroUpper(employee.cpf) ?? undefined,
        rg: cadastroUpper(employee.rg) ?? undefined,
      }),
    },
    select: { id: true, name: true },
  });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { playerId: player.id },
  });

  return player;
}

export async function unlinkPlayerFromEmployee(prisma: PrismaService, employeeId: string): Promise<void> {
  await prisma.employee.update({
    where: { id: employeeId },
    data: { playerId: null },
  });
}

export async function refreshPlayerRhEnrollment(
  prisma: PrismaService,
  employeeId: string,
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { code: true, cpf: true, rg: true, playerId: true },
  });
  if (!employee?.playerId) return;

  const player = await prisma.player.findUnique({ where: { id: employee.playerId } });
  if (!player) return;

  await prisma.player.update({
    where: { id: employee.playerId },
    data: {
      registrationProfile: patchRegistrationProfileRh(player.registrationProfile, {
        rhEnrollment: employee.code ?? undefined,
        cpf: cadastroUpper(employee.cpf) ?? undefined,
        rg: cadastroUpper(employee.rg) ?? undefined,
      }),
    },
  });
}
