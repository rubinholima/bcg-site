/** Propósito do registro — superfície estável para o dashboard (sem detalhes internos AWS). */
export type DnsInstructionPurpose = 'OWNERSHIP' | 'ACM_VALIDATION' | 'WEB_ALIAS';

export type DnsInstructionStatus = 'PENDING' | 'DONE';

export type PublicDomainDnsInstruction = {
  name: string;
  type: string;
  value: string;
  purpose: DnsInstructionPurpose;
  status: DnsInstructionStatus;
};

export type PublicDomainDnsCapability = 'MANAGED_ROUTE53' | 'EXTERNAL_DNS' | 'UNAVAILABLE';
