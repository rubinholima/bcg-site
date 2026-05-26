import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
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
  type: string;
  categories: unknown;
  tenant: { slug: string };
};

type PlayerIdentity = {
  id: string;
  tenantId: string;
  name: string;
  birthDate: string | null;
  photoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  category: string | null;
  registrationProfile: unknown;
};

function coalesceText(a: string | null | undefined, b: string | null | undefined): string | null {
  const left = cadastroUpper(a);
  const right = cadastroUpper(b);
  return left ?? right;
}

function coalesceEmail(a: string | null | undefined, b: string | null | undefined): string | null {
  return cadastroEmail(a) ?? cadastroEmail(b);
}

function extractPersonalFromProfile(profile: unknown): { cpf?: string; rg?: string; rhEnrollment?: string } {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return {};
  const personal = (profile as Record<string, unknown>).personal;
  if (!personal || typeof personal !== 'object' || Array.isArray(personal)) return {};
  const p = personal as Record<string, unknown>;
  return {
    cpf: typeof p.cpf === 'string' ? p.cpf : undefined,
    rg: typeof p.rg === 'string' ? p.rg : undefined,
    rhEnrollment: typeof p.rhEnrollment === 'string' ? p.rhEnrollment : undefined,
  };
}

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

function parsePlayerBirthDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim().slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatEmployeeBirthDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function mergeCategories(
  employeeCategories: unknown,
  playerCategory: string | null | undefined,
  employeeType: string,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  const hasCategories =
    Array.isArray(employeeCategories) && (employeeCategories as unknown[]).length > 0;
  if (hasCategories) return employeeCategories as Prisma.InputJsonValue;
  if (employeeType === 'athlete' && playerCategory?.trim()) {
    return [cadastroUpperRequired(playerCategory.trim())] as Prisma.InputJsonValue;
  }
  return undefined;
}

async function assertCanLinkEmployeeToPlayer(
  prisma: PrismaService,
  employee: { id: string; tenantId: string },
  playerId: string,
): Promise<PlayerIdentity> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      birthDate: true,
      photoUrl: true,
      contactEmail: true,
      contactPhone: true,
      category: true,
      registrationProfile: true,
    },
  });
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

  return player;
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

/** Preenche lacunas nos dois lados com dados de identidade compartilhados (RH ↔ Futebol). */
export async function syncLinkedIdentityBidirectional(
  prisma: PrismaService,
  employeeId: string,
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!employee?.playerId) return;

  const player = await prisma.player.findUnique({
    where: { id: employee.playerId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      birthDate: true,
      photoUrl: true,
      contactEmail: true,
      contactPhone: true,
      category: true,
      registrationProfile: true,
    },
  });
  if (!player) return;

  const personal = extractPersonalFromProfile(player.registrationProfile);

  const name = coalesceText(employee.name, player.name) ?? employee.name;
  const cpf = coalesceText(employee.cpf, personal.cpf);
  const rg = coalesceText(employee.rg, personal.rg);
  const email = coalesceEmail(employee.email, player.contactEmail);
  const phone = coalesceText(employee.phone, player.contactPhone);
  const photoUrl = employee.photoUrl?.trim() ? employee.photoUrl : player.photoUrl;
  const birthDate = employee.birthDate ?? parsePlayerBirthDate(player.birthDate);
  const birthDatePlayer = player.birthDate ?? formatEmployeeBirthDate(employee.birthDate);
  const rhEnrollment = coalesceText(employee.code, personal.rhEnrollment);
  const categories = mergeCategories(employee.categories, player.category, employee.type);

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      name: cadastroUpperRequired(name),
      cpf,
      rg,
      email,
      phone,
      photoUrl: photoUrl?.trim() || null,
      birthDate,
      ...(categories !== undefined && { categories }),
    },
  });

  await prisma.player.update({
    where: { id: player.id },
    data: {
      name: cadastroUpperRequired(name),
      birthDate: birthDatePlayer,
      photoUrl: photoUrl?.trim() || null,
      contactEmail: email,
      contactPhone: phone,
      registrationProfile: patchRegistrationProfileRh(player.registrationProfile, {
        rhEnrollment: rhEnrollment ?? undefined,
        cpf: cpf ?? undefined,
        rg: rg ?? undefined,
      }),
    },
  });
}

export async function syncLinkedIdentityByPlayerId(
  prisma: PrismaService,
  playerId: string,
): Promise<void> {
  const employee = await prisma.employee.findFirst({
    where: { playerId },
    select: { id: true },
  });
  if (!employee) return;
  await syncLinkedIdentityBidirectional(prisma, employee.id);
}

export async function syncPlayerFromEmployee(
  prisma: PrismaService,
  employee: EmployeeWithTenant,
  playerId: string,
): Promise<void> {
  await assertCanLinkEmployeeToPlayer(prisma, employee, playerId);

  await prisma.employee.update({
    where: { id: employee.id },
    data: { playerId },
  });

  await syncLinkedIdentityBidirectional(prisma, employee.id);
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

  await syncLinkedIdentityBidirectional(prisma, employee.id);

  return player;
}

export async function createEmployeeFromPlayer(
  prisma: PrismaService,
  playerId: string,
): Promise<{ id: string; code: string | null; name: string }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      birthDate: true,
      photoUrl: true,
      contactEmail: true,
      contactPhone: true,
      category: true,
      registrationProfile: true,
    },
  });
  if (!player) throw new NotFoundException('Atleta não encontrado');

  const existing = await prisma.employee.findFirst({ where: { playerId } });
  if (existing) {
    throw new BadRequestException('Este atleta já possui colaborador RH vinculado');
  }

  const personal = extractPersonalFromProfile(player.registrationProfile);
  const code = await generateEmployeeCode(prisma, player.tenantId);
  const categories = player.category?.trim()
    ? ([cadastroUpperRequired(player.category.trim())] as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  const employee = await prisma.employee.create({
    data: {
      tenantId: player.tenantId,
      code,
      name: cadastroUpperRequired(player.name),
      cpf: cadastroUpper(personal.cpf),
      rg: cadastroUpper(personal.rg),
      email: cadastroEmail(player.contactEmail),
      phone: cadastroUpper(player.contactPhone),
      birthDate: parsePlayerBirthDate(player.birthDate),
      type: 'athlete',
      categories,
      photoUrl: player.photoUrl?.trim() || null,
      playerId: player.id,
    },
    select: { id: true, code: true, name: true },
  });

  await syncLinkedIdentityBidirectional(prisma, employee.id);

  return employee;
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
  await syncLinkedIdentityBidirectional(prisma, employeeId);
}
