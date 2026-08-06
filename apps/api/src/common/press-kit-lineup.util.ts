import {
  normalizeFootballPositionCode,
  type FootballPositionCode,
} from './football-positions.util';

export type FormationSlotDef = {
  id: string;
  label: string;
  top: number;
  left: number;
  accepts: FootballPositionCode[];
};

export type FormationDefApi = {
  id: string;
  label: string;
  slots: FormationSlotDef[];
};

const FORMATIONS: FormationDefApi[] = [
  {
    id: '4-3-3',
    label: '4-3-3',
    slots: [
      { id: 'gk', label: 'GOL', top: 88, left: 50, accepts: ['GOLEIRO'] },
      { id: 'lb', label: 'LE', top: 68, left: 14, accepts: ['LATERAL ESQUERDO'] },
      { id: 'cb1', label: 'ZAG', top: 72, left: 36, accepts: ['ZAGUEIRO'] },
      { id: 'cb2', label: 'ZAG', top: 72, left: 64, accepts: ['ZAGUEIRO'] },
      { id: 'rb', label: 'LD', top: 68, left: 86, accepts: ['LATERAL DIREITO'] },
      { id: 'cm1', label: 'VOL', top: 48, left: 28, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      { id: 'cm2', label: 'MEI', top: 46, left: 50, accepts: ['MEIO-CAMPO', 'VOLANTE'] },
      { id: 'cm3', label: 'VOL', top: 48, left: 72, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      { id: 'lw', label: 'PE', top: 22, left: 18, accepts: ['EXTREMO'] },
      { id: 'st', label: 'ATA', top: 16, left: 50, accepts: ['CENTROAVANTE', 'EXTREMO'] },
      { id: 'rw', label: 'PD', top: 22, left: 82, accepts: ['EXTREMO'] },
    ],
  },
  {
    id: '4-4-2',
    label: '4-4-2',
    slots: [
      { id: 'gk', label: 'GOL', top: 88, left: 50, accepts: ['GOLEIRO'] },
      { id: 'lb', label: 'LE', top: 68, left: 14, accepts: ['LATERAL ESQUERDO'] },
      { id: 'cb1', label: 'ZAG', top: 72, left: 36, accepts: ['ZAGUEIRO'] },
      { id: 'cb2', label: 'ZAG', top: 72, left: 64, accepts: ['ZAGUEIRO'] },
      { id: 'rb', label: 'LD', top: 68, left: 86, accepts: ['LATERAL DIREITO'] },
      {
        id: 'lm',
        label: 'ME',
        top: 46,
        left: 16,
        accepts: ['MEIO-CAMPO', 'EXTREMO', 'LATERAL ESQUERDO'],
      },
      { id: 'cm1', label: 'VOL', top: 50, left: 38, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      { id: 'cm2', label: 'VOL', top: 50, left: 62, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      {
        id: 'rm',
        label: 'MD',
        top: 46,
        left: 84,
        accepts: ['MEIO-CAMPO', 'EXTREMO', 'LATERAL DIREITO'],
      },
      { id: 'st1', label: 'ATA', top: 18, left: 36, accepts: ['CENTROAVANTE', 'EXTREMO'] },
      { id: 'st2', label: 'ATA', top: 18, left: 64, accepts: ['CENTROAVANTE', 'EXTREMO'] },
    ],
  },
  {
    id: '4-2-3-1',
    label: '4-2-3-1',
    slots: [
      { id: 'gk', label: 'GOL', top: 88, left: 50, accepts: ['GOLEIRO'] },
      { id: 'lb', label: 'LE', top: 70, left: 14, accepts: ['LATERAL ESQUERDO'] },
      { id: 'cb1', label: 'ZAG', top: 74, left: 36, accepts: ['ZAGUEIRO'] },
      { id: 'cb2', label: 'ZAG', top: 74, left: 64, accepts: ['ZAGUEIRO'] },
      { id: 'rb', label: 'LD', top: 70, left: 86, accepts: ['LATERAL DIREITO'] },
      { id: 'cdm1', label: 'VOL', top: 56, left: 36, accepts: ['VOLANTE'] },
      { id: 'cdm2', label: 'VOL', top: 56, left: 64, accepts: ['VOLANTE'] },
      { id: 'lam', label: 'ME', top: 34, left: 18, accepts: ['MEIO-CAMPO', 'EXTREMO'] },
      { id: 'cam', label: 'MEI', top: 32, left: 50, accepts: ['MEIO-CAMPO'] },
      { id: 'ram', label: 'MD', top: 34, left: 82, accepts: ['MEIO-CAMPO', 'EXTREMO'] },
      { id: 'st', label: 'ATA', top: 14, left: 50, accepts: ['CENTROAVANTE', 'EXTREMO'] },
    ],
  },
  {
    id: '3-5-2',
    label: '3-5-2',
    slots: [
      { id: 'gk', label: 'GOL', top: 88, left: 50, accepts: ['GOLEIRO'] },
      { id: 'cb1', label: 'ZAG', top: 72, left: 26, accepts: ['ZAGUEIRO'] },
      { id: 'cb2', label: 'ZAG', top: 74, left: 50, accepts: ['ZAGUEIRO'] },
      { id: 'cb3', label: 'ZAG', top: 72, left: 74, accepts: ['ZAGUEIRO'] },
      { id: 'lwb', label: 'ALE', top: 48, left: 12, accepts: ['LATERAL ESQUERDO'] },
      { id: 'cm1', label: 'VOL', top: 52, left: 34, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      { id: 'cm2', label: 'MEI', top: 48, left: 50, accepts: ['MEIO-CAMPO', 'VOLANTE'] },
      { id: 'cm3', label: 'VOL', top: 52, left: 66, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      { id: 'rwb', label: 'ALD', top: 48, left: 88, accepts: ['LATERAL DIREITO'] },
      { id: 'st1', label: 'ATA', top: 18, left: 36, accepts: ['CENTROAVANTE', 'EXTREMO'] },
      { id: 'st2', label: 'ATA', top: 18, left: 64, accepts: ['CENTROAVANTE', 'EXTREMO'] },
    ],
  },
  {
    id: '3-4-3',
    label: '3-4-3',
    slots: [
      { id: 'gk', label: 'GOL', top: 88, left: 50, accepts: ['GOLEIRO'] },
      { id: 'cb1', label: 'ZAG', top: 72, left: 26, accepts: ['ZAGUEIRO'] },
      { id: 'cb2', label: 'ZAG', top: 74, left: 50, accepts: ['ZAGUEIRO'] },
      { id: 'cb3', label: 'ZAG', top: 72, left: 74, accepts: ['ZAGUEIRO'] },
      {
        id: 'lm',
        label: 'ALE',
        top: 48,
        left: 16,
        accepts: ['LATERAL ESQUERDO', 'EXTREMO', 'MEIO-CAMPO'],
      },
      { id: 'cm1', label: 'VOL', top: 50, left: 40, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      { id: 'cm2', label: 'VOL', top: 50, left: 60, accepts: ['VOLANTE', 'MEIO-CAMPO'] },
      {
        id: 'rm',
        label: 'ALD',
        top: 48,
        left: 84,
        accepts: ['LATERAL DIREITO', 'EXTREMO', 'MEIO-CAMPO'],
      },
      { id: 'lw', label: 'PE', top: 20, left: 20, accepts: ['EXTREMO'] },
      { id: 'st', label: 'ATA', top: 14, left: 50, accepts: ['CENTROAVANTE', 'EXTREMO'] },
      { id: 'rw', label: 'PD', top: 20, left: 80, accepts: ['EXTREMO'] },
    ],
  },
];

export function getFormationApi(id: string | null | undefined): FormationDefApi {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0]!;
}

type AthleteLike = {
  playerId?: string | null;
  name: string;
  position?: string | null;
  jerseyNumber?: number | null;
};

export function assignStartersByCadastroPosition(
  athletes: AthleteLike[],
  formationId: string | null | undefined,
  preferredIds: string[] = [],
): string[] {
  const formation = getFormationApi(formationId);
  const byId = new Map(
    athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
  );
  const preferredSet = new Set(preferredIds.filter((id) => byId.has(id)));
  const remaining = new Set(
    athletes.map((a) => a.playerId).filter((id): id is string => !!id),
  );

  const pickForSlot = (accepts: FootballPositionCode[]): string => {
    const candidates = [...remaining]
      .map((id) => byId.get(id)!)
      .filter((a) => {
        const code = normalizeFootballPositionCode(a.position);
        return code != null && accepts.includes(code);
      })
      .sort((a, b) => {
        const ap = preferredSet.has(a.playerId!) ? 0 : 1;
        const bp = preferredSet.has(b.playerId!) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        const aj = a.jerseyNumber ?? 999;
        const bj = b.jerseyNumber ?? 999;
        if (aj !== bj) return aj - bj;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    const chosen = candidates[0];
    if (!chosen?.playerId) return '';
    remaining.delete(chosen.playerId);
    return chosen.playerId;
  };

  const result = formation.slots.map((slot) => pickForSlot(slot.accepts));

  const fillOrder = [
    ...preferredIds.filter((id) => remaining.has(id)),
    ...[...remaining],
  ];
  let fi = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i]) continue;
    while (fi < fillOrder.length && !remaining.has(fillOrder[fi]!)) fi++;
    const id = fillOrder[fi++];
    if (!id) break;
    remaining.delete(id);
    result[i] = id;
  }

  return Array.from({ length: 11 }, (_, i) => result[i] ?? '');
}
