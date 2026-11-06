import type {
  PublicDomainProvisioningStatus,
  PublicDomainSslStatus,
  PublicDomainVerificationStatus,
} from '@prisma/client';

export type ProvisionRequest = {
  domainId: string;
  tenantId: string;
  hostnameNormalized: string;
  isCanonical: boolean;
};

export type ProvisionResult = {
  provisioningStatus: PublicDomainProvisioningStatus;
  sslStatus?: PublicDomainSslStatus;
  verificationStatus?: PublicDomainVerificationStatus;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  hostedZoneId?: string | null;
  certificateArn?: string | null;
  distributionId?: string | null;
};

/**
 * Provedor de infraestrutura (AWS CloudFront + ACM + Route53).
 * Implementação real fica atrás de flags/credenciais — aqui só contrato.
 */
export abstract class PublicDomainProvisioner {
  abstract provision(request: ProvisionRequest): Promise<ProvisionResult>;
  abstract disable(request: ProvisionRequest): Promise<ProvisionResult>;
}
