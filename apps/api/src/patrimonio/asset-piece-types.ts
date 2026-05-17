/** Peças / itens de kit e material esportivo vinculável ao patrimônio (categoria uniform). */
export const ASSET_PIECE_TYPES = [
  'camisa',
  'calção',
  'meião',
  'agasalho',
  'jaqueta',
  'colete_treino',
  'bermuda',
  'shorts',
  'meia_curta',
  'luvas',
  'chuteira',
  'caneleira',
  'faixa_capitao',
  'bone',
  'touca',
  'toalha',
  'mochila_esportiva',
] as const;

export type AssetPieceType = (typeof ASSET_PIECE_TYPES)[number];
