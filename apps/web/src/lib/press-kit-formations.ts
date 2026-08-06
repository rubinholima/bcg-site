/** Esquemas táticos para o Press Kit — posições em % no gramado (top/left). */

export type FormationSlot = {
  id: string;
  label: string;
  top: number;
  left: number;
};

export type FormationDef = {
  id: string;
  label: string;
  slots: FormationSlot[];
};

/**
 * Espaçamento amplo: goleiro na pequena área (~92%), zaga longe dele,
 * meio e ataque bem separados; laterais bem abertos nas laterais.
 */
export const PRESS_KIT_FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { id: "gk", label: "GOL", top: 92, left: 50 },
      { id: "lb", label: "LE", top: 68, left: 10 },
      { id: "cb1", label: "ZAG", top: 66, left: 32 },
      { id: "cb2", label: "ZAG", top: 66, left: 68 },
      { id: "rb", label: "LD", top: 68, left: 90 },
      { id: "cm1", label: "VOL", top: 42, left: 20 },
      { id: "cm2", label: "MEI", top: 40, left: 50 },
      { id: "cm3", label: "VOL", top: 42, left: 80 },
      { id: "lw", label: "PE", top: 14, left: 12 },
      { id: "st", label: "ATA", top: 12, left: 50 },
      { id: "rw", label: "PD", top: 14, left: 88 },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { id: "gk", label: "GOL", top: 92, left: 50 },
      { id: "lb", label: "LE", top: 68, left: 10 },
      { id: "cb1", label: "ZAG", top: 66, left: 32 },
      { id: "cb2", label: "ZAG", top: 66, left: 68 },
      { id: "rb", label: "LD", top: 68, left: 90 },
      { id: "lm", label: "ME", top: 42, left: 10 },
      { id: "cm1", label: "VOL", top: 40, left: 34 },
      { id: "cm2", label: "VOL", top: 40, left: 66 },
      { id: "rm", label: "MD", top: 42, left: 90 },
      { id: "st1", label: "ATA", top: 13, left: 34 },
      { id: "st2", label: "ATA", top: 13, left: 66 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { id: "gk", label: "GOL", top: 92, left: 50 },
      { id: "lb", label: "LE", top: 70, left: 10 },
      { id: "cb1", label: "ZAG", top: 68, left: 32 },
      { id: "cb2", label: "ZAG", top: 68, left: 68 },
      { id: "rb", label: "LD", top: 70, left: 90 },
      { id: "cdm1", label: "VOL", top: 50, left: 34 },
      { id: "cdm2", label: "VOL", top: 50, left: 66 },
      { id: "lam", label: "ME", top: 30, left: 12 },
      { id: "cam", label: "MEI", top: 28, left: 50 },
      { id: "ram", label: "MD", top: 30, left: 88 },
      { id: "st", label: "ATA", top: 11, left: 50 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { id: "gk", label: "GOL", top: 92, left: 50 },
      { id: "cb1", label: "ZAG", top: 68, left: 22 },
      { id: "cb2", label: "ZAG", top: 66, left: 50 },
      { id: "cb3", label: "ZAG", top: 68, left: 78 },
      { id: "lwb", label: "ALE", top: 44, left: 8 },
      { id: "cm1", label: "VOL", top: 42, left: 30 },
      { id: "cm2", label: "MEI", top: 40, left: 50 },
      { id: "cm3", label: "VOL", top: 42, left: 70 },
      { id: "rwb", label: "ALD", top: 44, left: 92 },
      { id: "st1", label: "ATA", top: 13, left: 34 },
      { id: "st2", label: "ATA", top: 13, left: 66 },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { id: "gk", label: "GOL", top: 92, left: 50 },
      { id: "cb1", label: "ZAG", top: 68, left: 22 },
      { id: "cb2", label: "ZAG", top: 66, left: 50 },
      { id: "cb3", label: "ZAG", top: 68, left: 78 },
      { id: "lm", label: "ALE", top: 42, left: 10 },
      { id: "cm1", label: "VOL", top: 40, left: 36 },
      { id: "cm2", label: "VOL", top: 40, left: 64 },
      { id: "rm", label: "ALD", top: 42, left: 90 },
      { id: "lw", label: "PE", top: 14, left: 14 },
      { id: "st", label: "ATA", top: 12, left: 50 },
      { id: "rw", label: "PD", top: 14, left: 86 },
    ],
  },
];

/** Âncora do chip no gramado — goleiro sobe o bloco para ficar na área sem cortar. */
export function pitchChipTranslateY(topPercent: number): string {
  if (topPercent >= 88) return "-92%";
  if (topPercent <= 16) return "-28%";
  return "-50%";
}

export function getFormation(id: string | null | undefined): FormationDef {
  return PRESS_KIT_FORMATIONS.find((f) => f.id === id) ?? PRESS_KIT_FORMATIONS[0]!;
}
