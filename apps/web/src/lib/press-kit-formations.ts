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
 * Linhas bem separadas na vertical + laterais sem colar na borda.
 * Em faixas com 4–5 atletas, ziguezague (top alternado) evita chip cobrir o vizinho.
 * Padding horizontal do container: 6%.
 */
export const PRESS_KIT_FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "lb", label: "LE", top: 72, left: 10 },
      { id: "cb1", label: "ZAG", top: 70, left: 32 },
      { id: "cb2", label: "ZAG", top: 70, left: 68 },
      { id: "rb", label: "LD", top: 72, left: 90 },
      { id: "cm1", label: "VOL", top: 46, left: 18 },
      { id: "cm2", label: "MEI", top: 40, left: 50 },
      { id: "cm3", label: "VOL", top: 46, left: 82 },
      { id: "lw", label: "PE", top: 14, left: 14 },
      { id: "st", label: "ATA", top: 10, left: 50 },
      { id: "rw", label: "PD", top: 14, left: 86 },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "lb", label: "LE", top: 72, left: 10 },
      { id: "cb1", label: "ZAG", top: 70, left: 32 },
      { id: "cb2", label: "ZAG", top: 70, left: 68 },
      { id: "rb", label: "LD", top: 72, left: 90 },
      { id: "lm", label: "ME", top: 48, left: 10 },
      { id: "cm1", label: "VOL", top: 40, left: 34 },
      { id: "cm2", label: "VOL", top: 40, left: 66 },
      { id: "rm", label: "MD", top: 48, left: 90 },
      { id: "st1", label: "ATA", top: 12, left: 34 },
      { id: "st2", label: "ATA", top: 12, left: 66 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "lb", label: "LE", top: 74, left: 10 },
      { id: "cb1", label: "ZAG", top: 72, left: 32 },
      { id: "cb2", label: "ZAG", top: 72, left: 68 },
      { id: "rb", label: "LD", top: 74, left: 90 },
      { id: "cdm1", label: "VOL", top: 56, left: 30 },
      { id: "cdm2", label: "VOL", top: 56, left: 70 },
      { id: "lam", label: "ME", top: 34, left: 12 },
      { id: "cam", label: "MEI", top: 28, left: 50 },
      { id: "ram", label: "MD", top: 34, left: 88 },
      { id: "st", label: "ATA", top: 10, left: 50 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "cb1", label: "ZAG", top: 72, left: 22 },
      { id: "cb2", label: "ZAG", top: 70, left: 50 },
      { id: "cb3", label: "ZAG", top: 72, left: 78 },
      { id: "lwb", label: "ALE", top: 50, left: 8 },
      { id: "cm1", label: "VOL", top: 38, left: 28 },
      { id: "cm2", label: "MEI", top: 46, left: 50 },
      { id: "cm3", label: "VOL", top: 38, left: 72 },
      { id: "rwb", label: "ALD", top: 50, left: 92 },
      { id: "st1", label: "ATA", top: 12, left: 34 },
      { id: "st2", label: "ATA", top: 12, left: 66 },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { id: "gk", label: "GOL", top: 96, left: 50 },
      { id: "cb1", label: "ZAG", top: 72, left: 22 },
      { id: "cb2", label: "ZAG", top: 70, left: 50 },
      { id: "cb3", label: "ZAG", top: 72, left: 78 },
      { id: "lm", label: "ALE", top: 48, left: 10 },
      { id: "cm1", label: "VOL", top: 38, left: 36 },
      { id: "cm2", label: "VOL", top: 38, left: 64 },
      { id: "rm", label: "ALD", top: 48, left: 90 },
      { id: "lw", label: "PE", top: 14, left: 14 },
      { id: "st", label: "ATA", top: 10, left: 50 },
      { id: "rw", label: "PD", top: 14, left: 86 },
    ],
  },
];

/** Âncora do chip no gramado — goleiro sobe o bloco; ataque baixa um pouco o texto. */
export function pitchChipTranslateY(topPercent: number): string {
  if (topPercent >= 94) return "-96%";
  if (topPercent >= 88) return "-92%";
  if (topPercent <= 14) return "-22%";
  return "-42%";
}

export function getFormation(id: string | null | undefined): FormationDef {
  return PRESS_KIT_FORMATIONS.find((f) => f.id === id) ?? PRESS_KIT_FORMATIONS[0]!;
}
