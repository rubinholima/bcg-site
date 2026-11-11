import type { ProvisionResult } from './public-domain-provisioner.interface';

/** Impede ACTIVE prematuro — todos os pré-requisitos explícitos. */
export function canMarkProvisioningActive(result: ProvisionResult): boolean {
  if (result.provisioningStatus === 'ERROR' || result.provisioningStatus === 'DISABLED') {
    return false;
  }
  if (result.provisioningStatus !== 'ACTIVE') return false;
  if (!result.certificateArn || !result.distributionId || !result.distributionDomain) {
    return false;
  }
  if (!result.cloudFrontFunctionArn) return false;
  if (result.provisioningStep) return false;
  if (result.lastErrorCode) return false;
  return true;
}
