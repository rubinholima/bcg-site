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
 * Laterais entre ~12–88% (com faixa segura de 7% nas bordas do gramado)
 * para não cortar chips; linhas bem separadas verticalmente.
 */
export const PRESS_KIT_FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "lb", label: "LE", top: 64, left: 12 },
      { id: "cb1", label: "ZAG", top: 62, left: 32 },
      { id: "cb2", label: "ZAG", top: 62, left: 68 },
      { id: "rb", label: "LD", top: 64, left: 88 },
      { id: "cm1", label: "VOL", top: 38, left: 20 },
      { id: "cm2", label: "MEI", top: 36, left: 50 },
      { id: "cm3", label: "VOL", top: 38, left: 80 },
      { id: "lw", label: "PE", top: 12, left: 14 },
      { id: "st", label: "ATA", top: 10, left: 50 },
      { id: "rw", label: "PD", top: 12, left: 86 },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "lb", label: "LE", top: 64, left: 12 },
      { id: "cb1", label: "ZAG", top: 62, left: 32 },
      { id: "cb2", label: "ZAG", top: 62, left: 68 },
      { id: "rb", label: "LD", top: 64, left: 88 },
      { id: "lm", label: "ME", top: 38, left: 12 },
      { id: "cm1", label: "VOL", top: 36, left: 34 },
      { id: "cm2", label: "VOL", top: 36, left: 66 },
      { id: "rm", label: "MD", top: 38, left: 88 },
      { id: "st1", label: "ATA", top: 11, left: 34 },
      { id: "st2", label: "ATA", top: 11, left: 66 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "lb", label: "LE", top: 66, left: 12 },
      { id: "cb1", label: "ZAG", top: 64, left: 32 },
      { id: "cb2", label: "ZAG", top: 64, left: 68 },
      { id: "rb", label: "LD", top: 66, left: 88 },
      { id: "cdm1", label: "VOL", top: 46, left: 34 },
      { id: "cdm2", label: "VOL", top: 46, left: 66 },
      { id: "lam", label: "ME", top: 26, left: 14 },
      { id: "cam", label: "MEI", top: 24, left: 50 },
      { id: "ram", label: "MD", top: 26, left: 86 },
      { id: "st", label: "ATA", top: 9, left: 50 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "cb1", label: "ZAG", top: 64, left: 22 },
      { id: "cb2", label: "ZAG", top: 62, left: 50 },
      { id: "cb3", label: "ZAG", top: 64, left: 78 },
      { id: "lwb", label: "ALE", top: 40, left: 11 },
      { id: "cm1", label: "VOL", top: 38, left: 30 },
      { id: "cm2", label: "MEI", top: 36, left: 50 },
      { id: "cm3", label: "VOL", top: 38, left: 70 },
      { id: "rwb", label: "ALD", top: 40, left: 89 },
      { id: "st1", label: "ATA", top: 11, left: 34 },
      { id: "st2", label: "ATA", top: 11, left: 66 },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "cb1", label: "ZAG", top: 64, left: 22 },
      { id: "cb2", label: "ZAG", top: 62, left: 50 },
      { id: "cb3", label: "ZAG", top: 64, left: 78 },
      { id: "lm", label: "ALE", top: 38, left: 12 },
      { id: "cm1", label: "VOL", top: 36, left: 36 },
      { id: "cm2", label: "VOL", top: 36, left: 64 },
      { id: "rm", label: "ALD", top: 38, left: 88 },
      { id: "lw", label: "PE", top: 12, left: 14 },
      { id: "st", label: "ATA", top: 10, left: 50 },
      { id: "rw", label: "PD", top: 12, left: 86 },
    ],
  },
];

/** Âncora do chip no gramado — goleiro sobe o bloco para ficar na área sem cortar. */
export function pitchChipTranslateY(topPercent: number): string {
  if (topPercent >= 90) return "-96%";
  if (topPercent <= 14) return "-28%";
  return "-50%";
}

export function getFormation(id: string | null | undefined): FormationDef {
  return PRESS_KIT_FORMATIONS.find((f) => f.id === id) ?? PRESS_KIT_FORMATIONS[0]!;
}
