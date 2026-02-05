import { BadRequestException, Injectable } from '@nestjs/common';
import {
  WorkMailClient,
  ListUsersCommand,
  ListOrganizationsCommand,
  CreateUserCommand,
  RegisterToWorkMailCommand,
  ResetPasswordCommand,
  DeleteUserCommand,
  DeregisterFromWorkMailCommand,
} from '@aws-sdk/client-workmail';
import { getAwsClientConfig } from '../common/aws-credentials';
import { isCustomDomain } from './workmail-domain.util';

const MIN_PASSWORD_LENGTH = 8;
/** WorkMail Name aceita apenas [\\w\\-.]+ (sem espaços). */
const LOCAL_PART_REGEX = /^[A-Za-z0-9._-]+$/;

export interface WorkMailUserListItem {
  workmailUserId: string;
  name: string;
  displayName: string;
  email: string;
  state: string;
}

export interface CreateUserAndRegisterResult {
  workmailUserId: string;
  email: string;
}

export interface OperationResult {
  success: boolean;
  message: string;
}

export interface WorkMailAwsOrgListItem {
  workmailOrganizationId: string;
  name: string;
  state?: string;
  domains: string[];
}

function getRegion(): string {
  return (process.env.AWS_REGION ?? 'us-east-1').trim();
}

function toCleanMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message ?? String(err);
    if (msg.includes('EntityAlreadyExistsException') || msg.includes('already exists')) {
      return 'O e-mail já existe nesta organização.';
    }
    if (msg.includes('OrganizationNotFoundException') || msg.includes('Organization not found')) {
      return 'Organização WorkMail não encontrada.';
    }
    if (msg.includes('InvalidParameterException') || msg.includes('Invalid parameter')) {
      return 'Parâmetro inválido. Verifique os dados e tente novamente.';
    }
    if (msg.includes('AccessDenied') || msg.includes('not authorized')) {
      return 'Sem permissão para executar esta ação no WorkMail.';
    }
    if (msg.includes('UserNotFoundException') || msg.includes('User not found')) {
      return 'Usuário não encontrado.';
    }
    if (msg.includes('InvalidPasswordException') || msg.includes('password')) {
      return 'Senha não atende aos requisitos da política (mínimo 8 caracteres, etc.).';
    }
    if (msg.includes('ValidationException') || msg.includes('Validation')) {
      return 'Dados inválidos para o WorkMail. Verifique nome (sem espaços), domínio e senha.';
    }
    return 'Operação WorkMail falhou. Tente novamente.';
  }
  return 'Operação WorkMail falhou. Tente novamente.';
}

/**
 * Sanitiza a parte local do email para o WorkMail (Name aceita apenas [\\w\\-.]+).
 * Retorna a string sanitizada ou lança BadRequestException se inválida.
 */
function sanitizeLocalPartForWorkMail(localPart: string): string {
  let s = (localPart ?? '').trim();
  if (s.includes('@')) s = s.split('@')[0].trim();
  s = s.replace(/\s/g, '');
  if (!s) {
    throw new BadRequestException('Parte local do e-mail é obrigatória.');
  }
  if (!LOCAL_PART_REGEX.test(s)) {
    throw new BadRequestException(
      'Local part inválido. Use apenas letras, números, ponto, hífen ou underscore (sem espaços).',
    );
  }
  return s;
}

@Injectable()
export class WorkMailService {
  private getClient(): WorkMailClient {
    const config = getAwsClientConfig();
    return new WorkMailClient({
      ...config,
      region: config.region || getRegion(),
    });
  }

  /**
   * Lista organizações WorkMail diretamente da AWS (não do banco).
   */
  async listOrganizationsFromAws(): Promise<WorkMailAwsOrgListItem[]> {
    const client = this.getClient();
    const items: WorkMailAwsOrgListItem[] = [];
    let nextToken: string | undefined;

    try {
      do {
        const cmd = new ListOrganizationsCommand({
          NextToken: nextToken,
          MaxResults: 50,
        });
        const out = await client.send(cmd);
        const summaries = out.OrganizationSummaries ?? [];
        for (const org of summaries) {
          const id = org.OrganizationId ?? '';
          if (!id) continue;
          const defaultDomain = org.DefaultMailDomain?.trim();
          const domainsRaw = defaultDomain ? [defaultDomain] : [];
          const domains = domainsRaw.filter((d) => isCustomDomain(d));
          items.push({
            workmailOrganizationId: id,
            name: org.Alias ?? org.DefaultMailDomain ?? id,
            state: org.State,
            domains,
          });
        }
        nextToken = out.NextToken ?? undefined;
      } while (nextToken);
      return items;
    } catch (err) {
      console.error('[WorkMailService] listOrganizationsFromAws error', err);
      throw new Error(toCleanMessage(err));
    }
  }

  private validateOrgId(workmailOrganizationId: string): void {
    const id = (workmailOrganizationId ?? '').trim();
    if (!id) {
      throw new Error('Organization ID é obrigatório.');
    }
  }

  private validateLocalPart(localPart: string): void {
    sanitizeLocalPartForWorkMail(localPart);
  }

  private validateDomain(domain: string): void {
    const d = (domain ?? '').trim();
    if (!d) {
      throw new Error('Domínio é obrigatório.');
    }
    if (!d.includes('.')) {
      throw new Error('Domínio inválido.');
    }
    if (!isCustomDomain(d)) {
      throw new Error(
        'Domínio não permitido para criação de emails. Use um domínio custom (ex: seunegocio.com). Domínios internos (awsapps.com, amazonaws.com) não são aceitos.',
      );
    }
  }

  private validatePassword(password: string, label = 'Senha'): void {
    if (!password || typeof password !== 'string') {
      throw new Error(`${label} é obrigatória.`);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`${label} deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
  }

  /**
   * Retorna o total de contas de email em todas as organizações WorkMail (AWS).
   * Usado pelo dashboard para exibir o número no card "Contas de email".
   */
  async getTotalAccountsCount(): Promise<number> {
    try {
      const orgs = await this.listOrganizationsFromAws();
      const activeOrgs = orgs.filter(
        (o) => (o.state ?? 'ENABLED').toUpperCase() === 'ENABLED' || (o.state ?? '').toUpperCase() === 'ACTIVE',
      );
      if (activeOrgs.length === 0) return 0;
      const counts = await Promise.all(
        activeOrgs.map((org) =>
          this.listUsers(org.workmailOrganizationId).then((users) => users.length),
        ),
      );
      return counts.reduce((a, b) => a + b, 0);
    } catch (err) {
      console.error('[WorkMailService] getTotalAccountsCount error', err);
      throw err;
    }
  }

  /**
   * Lista usuários da organização WorkMail com paginação.
   */
  async listUsers(workmailOrganizationId: string): Promise<WorkMailUserListItem[]> {
    this.validateOrgId(workmailOrganizationId);
    const client = this.getClient();
    const items: WorkMailUserListItem[] = [];
    let nextToken: string | undefined;

    try {
      do {
        const cmd = new ListUsersCommand({
          OrganizationId: workmailOrganizationId.trim(),
          NextToken: nextToken,
          MaxResults: 50,
        });
        const out = await client.send(cmd);
        const users = out.Users ?? [];
        for (const u of users) {
          items.push({
            workmailUserId: u.Id ?? '',
            name: u.Name ?? '',
            displayName: u.DisplayName ?? u.Name ?? '',
            email: u.Email ?? '',
            state: u.State ?? 'UNKNOWN',
          });
        }
        nextToken = out.NextToken ?? undefined;
      } while (nextToken);
      return items;
    } catch (err) {
      console.error('[WorkMailService] listUsers error', err);
      throw new Error(toCleanMessage(err));
    }
  }

  /**
   * Cria usuário no WorkMail e registra o e-mail (mailbox).
   * WorkMail exige Name no padrão [\w\-.]+ (sem espaços). DisplayName pode ter espaços.
   */
  async createUserAndRegister(
    workmailOrganizationId: string,
    domain: string,
    localPart: string,
    displayName: string,
    initialPassword: string,
  ): Promise<CreateUserAndRegisterResult> {
    this.validateOrgId(workmailOrganizationId);
    this.validateDomain(domain);
    const localPartSanitized = sanitizeLocalPartForWorkMail(localPart);
    this.validatePassword(initialPassword, 'Senha inicial');

    const domainTrimmed = domain.trim();
    const email = `${localPartSanitized}@${domainTrimmed}`;
    const client = this.getClient();

    try {
      const createCmd = new CreateUserCommand({
        OrganizationId: workmailOrganizationId.trim(),
        Name: localPartSanitized,
        DisplayName: (displayName ?? '').trim() || localPartSanitized,
        Password: initialPassword,
      });
      const createOut = await client.send(createCmd);
      const workmailUserId = createOut.UserId;
      if (!workmailUserId) {
        throw new Error('WorkMail não retornou o ID do usuário criado.');
      }

      await client.send(
        new RegisterToWorkMailCommand({
          OrganizationId: workmailOrganizationId.trim(),
          EntityId: workmailUserId,
          Email: email,
        }),
      );

      return { workmailUserId, email };
    } catch (err) {
      console.error('[WorkMailService] createUserAndRegister error', err);
      const msg = toCleanMessage(err);
      const isValidation =
        err instanceof Error &&
        (err.name === 'ValidationException' || err.message?.includes('Validation'));
      if (isValidation) {
        throw new BadRequestException(msg);
      }
      throw new Error(msg);
    }
  }

  /**
   * Redefine a senha do usuário WorkMail.
   */
  async resetPassword(
    workmailOrganizationId: string,
    workmailUserId: string,
    newPassword: string,
  ): Promise<OperationResult> {
    this.validateOrgId(workmailOrganizationId);
    if (!(workmailUserId ?? '').trim()) {
      throw new Error('ID do usuário WorkMail é obrigatório.');
    }
    this.validatePassword(newPassword, 'Nova senha');

    try {
      const client = this.getClient();
      await client.send(
        new ResetPasswordCommand({
          OrganizationId: workmailOrganizationId.trim(),
          UserId: workmailUserId.trim(),
          Password: newPassword,
        }),
      );
      return { success: true, message: 'Senha alterada com sucesso.' };
    } catch (err) {
      console.error('[WorkMailService] resetPassword error', err);
      return {
        success: false,
        message: toCleanMessage(err),
      };
    }
  }

  /**
   * Desregistra o email do WorkMail (mailbox desabilitado). NÃO deleta o usuário.
   */
  async deregisterFromWorkMail(
    workmailOrganizationId: string,
    entityId: string,
  ): Promise<OperationResult> {
    this.validateOrgId(workmailOrganizationId);
    const eid = (entityId ?? '').trim();
    if (!eid) {
      throw new Error('ID da entidade (workmailUserId) é obrigatório.');
    }
    try {
      const client = this.getClient();
      await client.send(
        new DeregisterFromWorkMailCommand({
          OrganizationId: workmailOrganizationId.trim(),
          EntityId: eid,
        }),
      );
      return { success: true, message: 'Email desabilitado com sucesso.' };
    } catch (err) {
      console.error('[WorkMailService] deregisterFromWorkMail error', err);
      return {
        success: false,
        message: toCleanMessage(err),
      };
    }
  }

  /**
   * Registra o email no WorkMail (mailbox habilitado). NÃO cria usuário.
   */
  async registerToWorkMail(
    workmailOrganizationId: string,
    entityId: string,
    email: string,
  ): Promise<OperationResult> {
    this.validateOrgId(workmailOrganizationId);
    const eid = (entityId ?? '').trim();
    if (!eid) {
      throw new Error('ID da entidade (workmailUserId) é obrigatório.');
    }
    const mail = (email ?? '').trim();
    if (!mail || !mail.includes('@')) {
      throw new Error('Email é obrigatório e deve conter @.');
    }
    try {
      const client = this.getClient();
      await client.send(
        new RegisterToWorkMailCommand({
          OrganizationId: workmailOrganizationId.trim(),
          EntityId: eid,
          Email: mail,
        }),
      );
      return { success: true, message: 'Email habilitado com sucesso.' };
    } catch (err) {
      console.error('[WorkMailService] registerToWorkMail error', err);
      return {
        success: false,
        message: toCleanMessage(err),
      };
    }
  }

  /**
   * Lista domínios custom extraídos dos emails existentes (ListUsers).
   * Filtra awsapps.com. Não depende de banco.
   */
  async listDomainsFromUsers(workmailOrganizationId: string): Promise<{
    domains: string[];
    primaryDomain?: string;
  }> {
    this.validateOrgId(workmailOrganizationId);
    const users = await this.listUsers(workmailOrganizationId.trim());
    const domainCount: Record<string, number> = {};
    for (const u of users) {
      const email = (u.email ?? '').trim();
      if (!email || !email.includes('@')) continue;
      const domain = email.split('@')[1]?.toLowerCase().trim();
      if (!domain || !isCustomDomain(domain)) continue;
      domainCount[domain] = (domainCount[domain] ?? 0) + 1;
    }
    const domains = [...new Set(Object.keys(domainCount))].sort(
      (a, b) => (domainCount[b] ?? 0) - (domainCount[a] ?? 0),
    );
    const primaryDomain = domains[0];
    return { domains, primaryDomain };
  }

  /**
   * Remove usuário da organização WorkMail (deregister + delete).
   */
  async deleteUser(
    workmailOrganizationId: string,
    workmailUserId: string,
  ): Promise<OperationResult> {
    this.validateOrgId(workmailOrganizationId);
    if (!(workmailUserId ?? '').trim()) {
      throw new Error('ID do usuário WorkMail é obrigatório.');
    }

    const client = this.getClient();
    const orgId = workmailOrganizationId.trim();
    const userId = workmailUserId.trim();

    try {
      try {
        await client.send(
          new DeregisterFromWorkMailCommand({
            OrganizationId: orgId,
            EntityId: userId,
          }),
        );
      } catch (deregErr) {
        console.error('[WorkMailService] deleteUser deregister (non-fatal)', deregErr);
        // Continua para DeleteUser; alguns usuários podem já estar deregistered
      }

      await client.send(
        new DeleteUserCommand({
          OrganizationId: orgId,
          UserId: userId,
        }),
      );
      return { success: true, message: 'Usuário removido com sucesso.' };
    } catch (err) {
      console.error('[WorkMailService] deleteUser error', err);
      return {
        success: false,
        message: toCleanMessage(err),
      };
    }
  }
}

/*
 * EXEMPLO DE USO (sem criar rota):
 *
 * import { WorkMailService } from './workmail/workmail.service';
 *
 * // Em um controller ou outro service (NestJS injeta WorkMailService):
 * constructor(private readonly workmail: WorkMailService) {}
 *
 * async listar() {
 *   const orgId = process.env.WORKMAIL_ORGANIZATION_ID ?? 'm-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
 *   const users = await this.workmail.listUsers(orgId);
 *   return users; // [{ workmailUserId, name, displayName, email, state }, ...]
 * }
 *
 * // Ou instanciando manualmente (fora do DI):
 * const service = new WorkMailService();
 * const users = await service.listUsers('m-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
 */
