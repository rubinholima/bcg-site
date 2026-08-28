import type { PrismaClient } from '@prisma/client';

export type DuplicateCbfRow = {
  cbfRegistration: string;
  count: number;
  playerIds: string[];
  names: string[];
};

export type DuplicateLicenseRow = {
  licenseNumber: string;
  count: number;
  staffIds: string[];
  names: string[];
};

/** Diagnóstico read-only — CBF duplicado no tenant afeta reconciliação de atletas. */
export async function findDuplicatePlayerCbf(
  prisma: Pick<PrismaClient, 'player'>,
  tenantId: string,
): Promise<DuplicateCbfRow[]> {
  const players = await prisma.player.findMany({
    where: { tenantId, cbfRegistration: { not: null } },
    select: { id: true, name: true, cbfRegistration: true },
  });
  const byCbf = new Map<string, typeof players>();
  for (const p of players) {
    const cbf = (p.cbfRegistration ?? '').trim();
    if (!cbf) continue;
    const list = byCbf.get(cbf) ?? [];
    list.push(p);
    byCbf.set(cbf, list);
  }
  return [...byCbf.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([cbfRegistration, list]) => ({
      cbfRegistration,
      count: list.length,
      playerIds: list.map((p) => p.id),
      names: list.map((p) => p.name),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Diagnóstico read-only — licença duplicada no tenant afeta reconciliação de comissão. */
export async function findDuplicateStaffLicenses(
  prisma: Pick<PrismaClient, 'technicalStaff'>,
  tenantId: string,
): Promise<DuplicateLicenseRow[]> {
  const staff = await prisma.technicalStaff.findMany({
    where: { tenantId, licenseNumber: { not: null } },
    select: { id: true, name: true, licenseNumber: true },
  });
  const byLicense = new Map<string, typeof staff>();
  for (const s of staff) {
    const lic = (s.licenseNumber ?? '').trim();
    if (!lic) continue;
    const list = byLicense.get(lic) ?? [];
    list.push(s);
    byLicense.set(lic, list);
  }
  return [...byLicense.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([licenseNumber, list]) => ({
      licenseNumber,
      count: list.length,
      staffIds: list.map((s) => s.id),
      names: list.map((s) => s.name),
    }))
    .sort((a, b) => b.count - a.count);
}
