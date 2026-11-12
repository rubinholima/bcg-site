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
  | 'rh_contracts_manage'
  | 'rh_payroll_view'
  | 'rh_payroll_manage'
  | 'rh_payroll_sensitive'
  | 'rh_time_view'
  | 'rh_time_manage'
  | 'rh_time_bank_view'
  | 'rh_time_bank_manage'
  | 'rh_work_regime_manage'
  | 'rh_time_clock_docs'
  | 'rh_athlete_payroll'
  | 'rh_epi_catalog'
  | 'rh_epi_manage'
  | 'rh_epi_view'
  | 'rh_epi_delivery'
  | 'rh_payslip_batch'
  | 'rh_payslip_individual'
  | 'rh_payslip_ack';

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
  rh_payroll_view: ['adm_rh', 'rh_payroll_view', 'rh_payroll_manage'],
  rh_payroll_manage: ['adm_rh', 'rh_payroll_manage'],
  rh_payroll_sensitive: ['adm_rh', 'rh_payroll_sensitive', 'rh_payroll_manage'],
  rh_time_view: ['adm_rh', 'rh_time_view', 'rh_time_manage'],
  rh_time_manage: ['adm_rh', 'rh_time_manage'],
  rh_time_bank_view: ['adm_rh', 'rh_time_bank_view', 'rh_time_bank_manage'],
  rh_time_bank_manage: ['adm_rh', 'rh_time_bank_manage'],
  rh_work_regime_manage: ['adm_rh', 'rh_work_regime_manage', 'rh_time_manage'],
  rh_time_clock_docs: ['adm_rh', 'rh_time_clock_docs', 'rh_time_manage'],
  rh_athlete_payroll: ['adm_rh', 'rh_athlete_payroll', 'rh_payroll_manage'],
  rh_epi_catalog: ['adm_rh', 'rh_epi_catalog', 'rh_epi_manage'],
  rh_epi_manage: ['adm_rh', 'rh_epi_manage'],
  rh_epi_view: ['adm_rh', 'rh_epi_view', 'rh_epi_manage'],
  rh_epi_delivery: ['adm_rh', 'rh_epi_delivery', 'rh_epi_manage'],
  rh_payslip_batch: ['adm_rh', 'rh_payslip_batch', 'rh_payroll_manage'],
  rh_payslip_individual: ['adm_rh', 'rh_payslip_individual', 'rh_payslip_batch'],
  rh_payslip_ack: ['adm_rh', 'rh_payslip_ack', 'rh_payslip_individual'],
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
  'rh_payroll_view',
  'rh_payroll_manage',
  'rh_payroll_sensitive',
  'rh_time_view',
  'rh_time_manage',
  'rh_time_bank_view',
  'rh_time_bank_manage',
  'rh_work_regime_manage',
  'rh_time_clock_docs',
  'rh_athlete_payroll',
  'rh_epi_catalog',
  'rh_epi_manage',
  'rh_epi_view',
  'rh_epi_delivery',
  'rh_payslip_batch',
  'rh_payslip_individual',
  'rh_payslip_ack',
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
