export type FinanceCapability =
  | 'finance_view'
  | 'finance_create'
  | 'finance_edit'
  | 'finance_approve'
  | 'finance_pay'
  | 'finance_manual_settlement'
  | 'finance_payment_account_override'
  | 'finance_accounts_manage'
  | 'finance_categories_manage'
  | 'finance_payment_methods_manage'
  | 'finance_bank_data_view'
  | 'finance_bank_data_manage'
  | 'finance_reports_view'
  | 'finance_reports_export';

const CAPABILITY_MODULES: Record<FinanceCapability, string[]> = {
  finance_view: ['adm_financeiro', 'finance_view', 'finance_create', 'finance_edit'],
  finance_create: ['adm_financeiro', 'finance_create', 'finance_edit'],
  finance_edit: ['adm_financeiro', 'finance_edit'],
  finance_approve: ['adm_financeiro', 'finance_approve', 'finance_edit'],
  finance_pay: ['adm_financeiro', 'finance_pay'],
  finance_manual_settlement: ['adm_financeiro', 'finance_manual_settlement', 'finance_pay'],
  finance_payment_account_override: ['adm_financeiro', 'finance_payment_account_override', 'finance_pay'],
  finance_accounts_manage: ['adm_financeiro', 'finance_accounts_manage'],
  finance_categories_manage: ['adm_financeiro', 'finance_categories_manage'],
  finance_payment_methods_manage: ['adm_financeiro', 'finance_payment_methods_manage'],
  finance_bank_data_view: ['adm_financeiro', 'finance_bank_data_view', 'finance_bank_data_manage'],
  finance_bank_data_manage: ['adm_financeiro', 'finance_bank_data_manage'],
  finance_reports_view: ['adm_financeiro', 'finance_reports_view', 'finance_reports_export'],
  finance_reports_export: ['adm_financeiro', 'finance_reports_export'],
};

const ADM_FINANCE_IMPLIES: FinanceCapability[] = [
  'finance_view',
  'finance_create',
  'finance_edit',
  'finance_approve',
  'finance_pay',
  'finance_manual_settlement',
  'finance_payment_account_override',
  'finance_accounts_manage',
  'finance_categories_manage',
  'finance_payment_methods_manage',
  'finance_bank_data_view',
  'finance_bank_data_manage',
  'finance_reports_view',
  'finance_reports_export',
];

export function hasFinanceCapability(
  moduleSlugs: string[],
  capability: FinanceCapability,
  platformRole?: string,
): boolean {
  if (platformRole === 'super_admin' || platformRole === 'company_admin') return true;
  if (moduleSlugs.includes('adm_financeiro') && ADM_FINANCE_IMPLIES.includes(capability)) {
    return true;
  }
  const needed = CAPABILITY_MODULES[capability];
  return needed.some((s) => moduleSlugs.includes(s));
}

export const ALL_FINANCE_CAPABILITIES: FinanceCapability[] = [...ADM_FINANCE_IMPLIES];
