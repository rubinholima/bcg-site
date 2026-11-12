export type RhCapability =
  | 'rh_view'
  | 'rh_manage'
  | 'rh_hiring_view'
  | 'rh_hiring_manage'
  | 'rh_compensation_view'
  | 'rh_compensation_manage'
  | 'rh_bank_view'
  | 'rh_bank_manage'
  | 'rh_private_docs_view'
  | 'rh_private_docs_manage'
  | 'rh_contracts_view'
  | 'rh_contracts_manage';

const CAPABILITY_MODULES: Record<RhCapability, string[]> = {
  rh_view: ['adm_rh', 'rh_view'],
  rh_manage: ['adm_rh', 'rh_manage'],
  rh_hiring_view: ['adm_rh', 'rh_hiring_view', 'rh_hiring_manage'],
  rh_hiring_manage: ['adm_rh', 'rh_hiring_manage'],
  rh_compensation_view: ['adm_rh', 'rh_compensation_view', 'rh_compensation_manage'],
  rh_compensation_manage: ['adm_rh', 'rh_compensation_manage'],
  rh_bank_view: ['adm_rh', 'rh_bank_view', 'rh_bank_manage'],
  rh_bank_manage: ['adm_rh', 'rh_bank_manage'],
  rh_private_docs_view: ['adm_rh', 'rh_private_docs_view', 'rh_private_docs_manage'],
  rh_private_docs_manage: ['adm_rh', 'rh_private_docs_manage'],
  rh_contracts_view: ['adm_rh', 'rh_contracts_view', 'rh_contracts_manage'],
  rh_contracts_manage: ['adm_rh', 'rh_contracts_manage'],
};

/** adm_rh concede todas as capacidades granulares de RH. */
const ADM_RH_IMPLIES: RhCapability[] = [
  'rh_view',
  'rh_manage',
  'rh_hiring_view',
  'rh_hiring_manage',
  'rh_compensation_view',
  'rh_compensation_manage',
  'rh_bank_view',
  'rh_bank_manage',
  'rh_private_docs_view',
  'rh_private_docs_manage',
  'rh_contracts_view',
  'rh_contracts_manage',
];

export function hasRhCapability(
  moduleSlugs: string[],
  capability: RhCapability,
  platformRole?: string,
): boolean {
  if (platformRole === 'super_admin' || platformRole === 'company_admin') return true;
  if (moduleSlugs.includes('adm_rh') && ADM_RH_IMPLIES.includes(capability)) {
    return true;
  }
  const needed = CAPABILITY_MODULES[capability];
  return needed.some((s) => moduleSlugs.includes(s));
}

export const ALL_RH_CAPABILITIES: RhCapability[] = [...ADM_RH_IMPLIES];
