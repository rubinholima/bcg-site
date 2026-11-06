import { Injectable, Logger } from '@nestjs/common';
import {
  PublicDomainProvisioner,
  type ProvisionRequest,
  type ProvisionResult,
} from './public-domain-provisioner.interface';

/**
 * Stub AWS — não executa chamadas reais. Orquestração futura (cert CloudFront, Route53).
 */
@Injectable()
export class AwsPublicDomainProvider extends PublicDomainProvisioner {
  private readonly log = new Logger(AwsPublicDomainProvider.name);

  async provision(_request: ProvisionRequest): Promise<ProvisionResult> {
    this.log.warn('AwsPublicDomainProvider.provision: stub (sem mutação AWS)');
    return {
      provisioningStatus: 'NOT_CONFIGURED',
      lastErrorCode: 'AWS_PROVIDER_NOT_CONFIGURED',
      lastErrorMessage:
        'Provisionamento AWS não está ativado. Configure credenciais e implementação na próxima fase.',
    };
  }

  async disable(_request: ProvisionRequest): Promise<ProvisionResult> {
    return {
      provisioningStatus: 'DISABLED',
    };
  }
}
