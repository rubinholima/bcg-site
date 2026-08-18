export const NURSING_DEFAULT_DIAGNOSES = [
  'Febre',
  'Cefaleia',
  'Náusea / vômito',
  'Diarreia',
  'Constipação',
  'Dor muscular',
  'Contusão / trauma leve',
  'Corte / ferimento superficial',
  'Resfriado / gripe',
  'Alergia / reação cutânea',
  'Desidratação',
  'Indisposição geral',
] as const;

export const NURSING_DEFAULT_TREATMENTS: Array<{
  name: string;
  kind: string;
  defaultUnit?: string;
}> = [
  { name: 'Dipirona', kind: 'medicamento', defaultUnit: 'ml' },
  { name: 'Paracetamol', kind: 'medicamento', defaultUnit: 'mg' },
  { name: 'Ibuprofeno', kind: 'medicamento', defaultUnit: 'mg' },
  { name: 'Soro fisiológico 0,9%', kind: 'medicamento', defaultUnit: 'ml' },
  { name: 'Curativo simples', kind: 'curativo', defaultUnit: 'un' },
  { name: 'Gelo local', kind: 'procedimento' },
  { name: 'Repouso relativo', kind: 'procedimento' },
  { name: 'Hidratação oral', kind: 'procedimento' },
  { name: 'Compressa fria', kind: 'procedimento' },
  { name: 'Antihistamínico', kind: 'medicamento', defaultUnit: 'mg' },
];
