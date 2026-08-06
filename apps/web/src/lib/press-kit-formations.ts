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

/** Linhas alinhadas (mesmo `top` por setor) — titulares lado a lado, sem “escada”. */
export const PRESS_KIT_FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { id: "gk", label: "GOL", top: 78, left: 50 },
      { id: "lb", label: "LE", top: 68, left: 16 },
      { id: "cb1", label: "ZAG", top: 68, left: 37 },
      { id: "cb2", label: "ZAG", top: 68, left: 63 },
      { id: "rb", label: "LD", top: 68, left: 84 },
      { id: "cm1", label: "VOL", top: 46, left: 26 },
      { id: "cm2", label: "MEI", top: 46, left: 50 },
      { id: "cm3", label: "VOL", top: 46, left: 74 },
      { id: "lw", label: "PE", top: 22, left: 18 },
      { id: "st", label: "ATA", top: 22, left: 50 },
      { id: "rw", label: "PD", top: 22, left: 82 },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { id: "gk", label: "GOL", top: 78, left: 50 },
      { id: "lb", label: "LE", top: 68, left: 16 },
      { id: "cb1", label: "ZAG", top: 68, left: 37 },
      { id: "cb2", label: "ZAG", top: 68, left: 63 },
      { id: "rb", label: "LD", top: 68, left: 84 },
      { id: "lm", label: "ME", top: 46, left: 16 },
      { id: "cm1", label: "VOL", top: 46, left: 38 },
      { id: "cm2", label: "VOL", top: 46, left: 62 },
      { id: "rm", label: "MD", top: 46, left: 84 },
      { id: "st1", label: "ATA", top: 22, left: 36 },
      { id: "st2", label: "ATA", top: 22, left: 64 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { id: "gk", label: "GOL", top: 78, left: 50 },
      { id: "lb", label: "LE", top: 70, left: 16 },
      { id: "cb1", label: "ZAG", top: 70, left: 37 },
      { id: "cb2", label: "ZAG", top: 70, left: 63 },
      { id: "rb", label: "LD", top: 70, left: 84 },
      { id: "cdm1", label: "VOL", top: 52, left: 36 },
      { id: "cdm2", label: "VOL", top: 52, left: 64 },
      { id: "lam", label: "ME", top: 34, left: 18 },
      { id: "cam", label: "MEI", top: 34, left: 50 },
      { id: "ram", label: "MD", top: 34, left: 82 },
      { id: "st", label: "ATA", top: 16, left: 50 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { id: "gk", label: "GOL", top: 78, left: 50 },
      { id: "cb1", label: "ZAG", top: 70, left: 26 },
      { id: "cb2", label: "ZAG", top: 70, left: 50 },
      { id: "cb3", label: "ZAG", top: 70, left: 74 },
      { id: "lwb", label: "ALE", top: 48, left: 14 },
      { id: "cm1", label: "VOL", top: 48, left: 34 },
      { id: "cm2", label: "MEI", top: 48, left: 50 },
      { id: "cm3", label: "VOL", top: 48, left: 66 },
      { id: "rwb", label: "ALD", top: 48, left: 86 },
      { id: "st1", label: "ATA", top: 22, left: 36 },
      { id: "st2", label: "ATA", top: 22, left: 64 },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { id: "gk", label: "GOL", top: 78, left: 50 },
      { id: "cb1", label: "ZAG", top: 70, left: 26 },
      { id: "cb2", label: "ZAG", top: 70, left: 50 },
      { id: "cb3", label: "ZAG", top: 70, left: 74 },
      { id: "lm", label: "ALE", top: 48, left: 16 },
      { id: "cm1", label: "VOL", top: 48, left: 40 },
      { id: "cm2", label: "VOL", top: 48, left: 60 },
      { id: "rm", label: "ALD", top: 48, left: 84 },
      { id: "lw", label: "PE", top: 22, left: 20 },
      { id: "st", label: "ATA", top: 22, left: 50 },
      { id: "rw", label: "PD", top: 22, left: 80 },
    ],
  },
];

export function getFormation(id: string | null | undefined): FormationDef {
  return PRESS_KIT_FORMATIONS.find((f) => f.id === id) ?? PRESS_KIT_FORMATIONS[0]!;
}
