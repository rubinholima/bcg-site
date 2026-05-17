/** Valores persistidos em AssetCategory.kind (uniform ativa campos de kit no cadastro do bem). */
export const ASSET_CATEGORY_KINDS = [
  'general',
  'uniform',
  'furniture',
  'it_equipment',
  'vehicle',
  'machinery',
  'sports_equipment',
  'medical',
  'infrastructure',
  'kitchen',
  'office',
  'audiovisual',
  'security',
  'musical',
  'library',
  'clothing_other',
  'bedding',
  'cleaning',
  'garden',
  'laboratory',
  'art',
  'others',
] as const;

export type AssetCategoryKind = (typeof ASSET_CATEGORY_KINDS)[number];

export const UNIFORM_KIND: AssetCategoryKind = 'uniform';
