/** Categorias de patrimônio que recebem aba Infraestrutura (sem cadastro duplicado). */
export const TECHNOLOGY_ASSET_KINDS = [
  'it_equipment',
  'infrastructure',
  'audiovisual',
  'security',
] as const;

export type TechnologyAssetKind = (typeof TECHNOLOGY_ASSET_KINDS)[number];

export function isTechnologyAssetKind(kind: string | null | undefined): boolean {
  if (!kind) return false;
  return (TECHNOLOGY_ASSET_KINDS as readonly string[]).includes(kind);
}
