import { PrismaService } from '../prisma/prisma.service';

const UNIFORM_NAME_KEYS = [
  'athletesGame',
  'athletesTravel',
  'staffGame',
  'staffTravel',
] as const;

const UNIFORM_ID_KEYS: Record<(typeof UNIFORM_NAME_KEYS)[number], string> = {
  athletesGame: 'athletesGameKitId',
  athletesTravel: 'athletesTravelKitId',
  staffGame: 'staffGameKitId',
  staffTravel: 'staffTravelKitId',
};

/** Sincroniza nomes a partir dos IDs estáveis (rename-safe para novas referências). */
export async function enrichTravelUniformsFromKitIds(
  prisma: PrismaService,
  uniforms: unknown,
): Promise<Record<string, unknown> | null | undefined> {
  if (uniforms == null) return uniforms as null | undefined;
  if (typeof uniforms !== 'object' || Array.isArray(uniforms)) return uniforms as Record<string, unknown>;
  const out: Record<string, unknown> = { ...(uniforms as Record<string, unknown>) };

  for (const nameKey of UNIFORM_NAME_KEYS) {
    const idKey = UNIFORM_ID_KEYS[nameKey];
    const kitId = out[idKey];
    if (typeof kitId !== 'string' || !kitId.trim()) continue;
    const kit = await prisma.logisticsUniformKit.findUnique({
      where: { id: kitId.trim() },
      select: { name: true },
    });
    if (kit?.name) out[nameKey] = kit.name;
  }
  return out;
}
