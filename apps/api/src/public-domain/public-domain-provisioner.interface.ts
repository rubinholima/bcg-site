import type {
  PublicDomainProvisioningStatus,
  PublicDomainSslStatus,
  PublicDomainVerificationStatus,
} from '@prisma/client';

import type { DnsInstructionPurpose, DnsInstructionStatus } from './public-domain-dns-instruction.model';

export type DnsInstruction = {
  name: string;
  type: string;
  value: string;
  purpose?: DnsInstructionPurpose;
  status?: DnsInstructionStatus;
};

export type ProvisionRequest = {
  domainId: string;
  tenantId: string;
  hostnameNormalized: string;
  isCanonical: boolean;
  /** Hostnames do tenant (www + apex) para SAN e aliases. */
  allTenantHostnames: string[];
  persistedCertificateArn?: string | null;
  persistedHostedZoneId?: string | null;
  persistedDistributionId?: string | null;
  persistedDistributionDomain?: string | null;
  persistedCloudFrontFunctionArn?: string | null;
};

export type ProvisionResult = {
  provisioningStatus: PublicDomainProvisioningStatus;
  sslStatus?: PublicDomainSslStatus;
  verificationStatus?: PublicDomainVerificationStatus;
  provisioningStep?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  hostedZoneId?: string | null;
  certificateArn?: string | null;
  distributionId?: string | null;
  distributionDomain?: string | null;
  cloudFrontFunctionArn?: string | null;
  /** Registros que o cliente deve criar (DNS externo ou alias). */
  externalDnsInstructions?: DnsInstruction[];
};

/**
 * Provedor de infraestrutura (AWS CloudFront + ACM + Route53).
 * Implementação real fica atrás de flags/credenciais — aqui só contrato.
 */
export abstract class PublicDomainProvisioner {
  abstract provision(request: ProvisionRequest): Promise<ProvisionResult>;
  abstract disable(request: ProvisionRequest): Promise<ProvisionResult>;
}
