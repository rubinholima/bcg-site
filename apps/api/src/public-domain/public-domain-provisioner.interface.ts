import type {
  PublicDomainProvisioningStatus,
  PublicDomainSslStatus,
  PublicDomainVerificationStatus,
} from '@prisma/client';

export type DnsInstruction = {
  name: string;
  type: string;
  value: string;
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
