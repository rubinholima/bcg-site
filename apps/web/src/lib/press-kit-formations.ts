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
 * Goleiro bem baixo na área; zaga mais baixa; meio bem aberto nas laterais
 * (faixa segura ~12–88% com padding 7% do container).
 */
export const PRESS_KIT_FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { id: "gk", label: "GOL", top: 98, left: 50 },
      { id: "lb", label: "LE", top: 74, left: 12 },
      { id: "cb1", label: "ZAG", top: 72, left: 32 },
      { id: "cb2", label: "ZAG", top: 72, left: 68 },
      { id: "rb", label: "LD", top: 74, left: 88 },
      { id: "cm1", label: "VOL", top: 42, left: 18 },
      { id: "cm2", label: "MEI", top: 40, left: 50 },
      { id: "cm3", label: "VOL", top: 42, left: 82 },
      { id: "lw", label: "PE", top: 12, left: 14 },
      { id: "st", label: "ATA", top: 10, left: 50 },
      { id: "rw", label: "PD", top: 12, left: 86 },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { id: "gk", label: "GOL", top: 98, left: 50 },
      { id: "lb", label: "LE", top: 74, left: 12 },
      { id: "cb1", label: "ZAG", top: 72, left: 32 },
      { id: "cb2", label: "ZAG", top: 72, left: 68 },
      { id: "rb", label: "LD", top: 74, left: 88 },
      { id: "lm", label: "ME", top: 42, left: 12 },
      { id: "cm1", label: "VOL", top: 40, left: 34 },
      { id: "cm2", label: "VOL", top: 40, left: 66 },
      { id: "rm", label: "MD", top: 42, left: 88 },
      { id: "st1", label: "ATA", top: 11, left: 34 },
      { id: "st2", label: "ATA", top: 11, left: 66 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { id: "gk", label: "GOL", top: 98, left: 50 },
      { id: "lb", label: "LE", top: 76, left: 12 },
      { id: "cb1", label: "ZAG", top: 74, left: 32 },
      { id: "cb2", label: "ZAG", top: 74, left: 68 },
      { id: "rb", label: "LD", top: 76, left: 88 },
      { id: "cdm1", label: "VOL", top: 52, left: 32 },
      { id: "cdm2", label: "VOL", top: 52, left: 68 },
      { id: "lam", label: "ME", top: 28, left: 14 },
      { id: "cam", label: "MEI", top: 26, left: 50 },
      { id: "ram", label: "MD", top: 28, left: 86 },
      { id: "st", label: "ATA", top: 9, left: 50 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { id: "gk", label: "GOL", top: 98, left: 50 },
      { id: "cb1", label: "ZAG", top: 74, left: 22 },
      { id: "cb2", label: "ZAG", top: 72, left: 50 },
      { id: "cb3", label: "ZAG", top: 74, left: 78 },
      { id: "lwb", label: "ALE", top: 44, left: 12 },
      { id: "cm1", label: "VOL", top: 42, left: 28 },
      { id: "cm2", label: "MEI", top: 40, left: 50 },
      { id: "cm3", label: "VOL", top: 42, left: 72 },
      { id: "rwb", label: "ALD", top: 44, left: 88 },
      { id: "st1", label: "ATA", top: 11, left: 34 },
      { id: "st2", label: "ATA", top: 11, left: 66 },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { id: "gk", label: "GOL", top: 98, left: 50 },
      { id: "cb1", label: "ZAG", top: 74, left: 22 },
      { id: "cb2", label: "ZAG", top: 72, left: 50 },
      { id: "cb3", label: "ZAG", top: 74, left: 78 },
      { id: "lm", label: "ALE", top: 42, left: 12 },
      { id: "cm1", label: "VOL", top: 40, left: 34 },
      { id: "cm2", label: "VOL", top: 40, left: 66 },
      { id: "rm", label: "ALD", top: 42, left: 88 },
      { id: "lw", label: "PE", top: 12, left: 14 },
      { id: "st", label: "ATA", top: 10, left: 50 },
      { id: "rw", label: "PD", top: 12, left: 86 },
    ],
  },
];

/** Âncora do chip no gramado — goleiro sobe o bloco para ficar na área sem cortar. */
export function pitchChipTranslateY(topPercent: number): string {
  if (topPercent >= 94) return "-98%";
  if (topPercent >= 88) return "-96%";
  if (topPercent <= 14) return "-28%";
  return "-50%";
}

export function getFormation(id: string | null | undefined): FormationDef {
  return PRESS_KIT_FORMATIONS.find((f) => f.id === id) ?? PRESS_KIT_FORMATIONS[0]!;
}
