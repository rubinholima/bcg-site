import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
  AttributeType,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { getAwsClientConfig, hasExplicitAwsCredentials } from '../common/aws-credentials';

function getConfig() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? '';
  const region = process.env.AWS_REGION ?? 'us-east-1';
  return { userPoolId, region };
}

export type CognitoRole = 'super_admin' | 'company_admin' | 'editor' | 'user';

const ROLE_GROUPS: CognitoRole[] = ['super_admin', 'company_admin', 'editor', 'user'];

export interface CognitoUserListItem {
  username: string;
  sub: string;
  email: string;
  name: string | null;
  role: CognitoRole;
  enabled: boolean;
  userCreateDate?: Date;
  userLastModifiedDate?: Date;
}

@Injectable()
export class CognitoService implements OnModuleInit {
  onModuleInit() {
    if (!hasExplicitAwsCredentials()) {
      console.warn(
        '[CognitoService] AWS credentials not found in env. For local dev, run `aws configure` or set AWS_PROFILE, or set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. In production, use IAM Role.',
      );
    }
  }

  private getClient(): CognitoIdentityProviderClient {
    const config = getAwsClientConfig();
    return new CognitoIdentityProviderClient(config);
  }

  private getAttr(attrs: AttributeType[] | undefined, name: string): string | null {
    const a = attrs?.find((x) => x.Name === name);
    return a?.Value ?? null;
  }

  private async getGroupsForUsername(username: string, userPoolId: string, client: CognitoIdentityProviderClient): Promise<string[]> {
    const cmd = new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    });
    const out = await client.send(cmd);
    return (out.Groups ?? []).map((g) => g.GroupName ?? '').filter(Boolean);
  }

  private groupsToRole(groups: string[]): CognitoRole {
    if (groups.includes('super_admin')) return 'super_admin';
    if (groups.includes('company_admin')) return 'company_admin';
    if (groups.includes('editor')) return 'editor';
    return 'user';
  }

  async listUsers(): Promise<CognitoUserListItem[]> {
    const { userPoolId } = getConfig();
    if (!userPoolId) return [];
    const client = this.getClient();
    const items: CognitoUserListItem[] = [];
    let nextToken: string | undefined;
    do {
      const cmd = new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60,
        PaginationToken: nextToken,
      });
      const out = await client.send(cmd);
      const users = out.Users ?? [];
      for (const u of users) {
        const username = u.Username ?? '';
        const attrs = u.Attributes ?? [];
        const sub = this.getAttr(attrs, 'sub') ?? '';
        const email = this.getAttr(attrs, 'email') ?? this.getAttr(attrs, 'preferred_username') ?? '';
        const name = this.getAttr(attrs, 'name') ?? this.getAttr(attrs, 'given_name') ?? null;
        const groups = await this.getGroupsForUsername(username, userPoolId, client);
        const role = this.groupsToRole(groups);
        items.push({
          username,
          sub,
          email,
          name,
          role,
          enabled: u.Enabled ?? false,
          userCreateDate: u.UserCreateDate,
          userLastModifiedDate: u.UserLastModifiedDate,
        });
      }
      nextToken = out.PaginationToken ?? undefined;
    } while (nextToken);
    return items;
  }

  async createUser(params: {
    email: string;
    name?: string | null;
    temporaryPassword: string;
    role: CognitoRole;
  }): Promise<{ username: string; sub: string }> {
    const { userPoolId } = getConfig();
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID not configured');
    }
    const client = this.getClient();
    const attrs: AttributeType[] = [
      { Name: 'email', Value: params.email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'preferred_username', Value: params.email },
    ];
    if (params.name) {
      attrs.push({ Name: 'name', Value: params.name });
    }
    const cmd = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: params.email,
      TemporaryPassword: params.temporaryPassword,
      UserAttributes: attrs,
      MessageAction: MessageActionType.SUPPRESS,
    });
    const out = await client.send(cmd);
    const username = out.User?.Username ?? params.email;
    const subAttr = out.User?.Attributes?.find((a) => a.Name === 'sub');
    const sub = subAttr?.Value ?? '';
    if (!sub) {
      throw new Error('Cognito did not return sub for created user');
    }
    await this.setUserRole(username, params.role);
    return { username, sub };
  }

  async setUserRole(username: string, role: CognitoRole): Promise<void> {
    const { userPoolId } = getConfig();
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID not configured');
    }
    const client = this.getClient();
    const currentGroups = await this.getGroupsForUsername(username, userPoolId, client);
    for (const g of ROLE_GROUPS) {
      if (currentGroups.includes(g)) {
        await client.send(
          new AdminRemoveUserFromGroupCommand({
            UserPoolId: userPoolId,
            Username: username,
            GroupName: g,
          }),
        );
      }
    }
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: role,
      }),
    );
  }

  async getUser(username: string): Promise<CognitoUserListItem | null> {
    const { userPoolId } = getConfig();
    if (!userPoolId) return null;
    const client = this.getClient();
    try {
      const cmd = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });
      const out = await client.send(cmd);
      const attrs = out.UserAttributes ?? [];
      const sub = this.getAttr(attrs, 'sub') ?? '';
      const email = this.getAttr(attrs, 'email') ?? this.getAttr(attrs, 'preferred_username') ?? '';
      const name = this.getAttr(attrs, 'name') ?? this.getAttr(attrs, 'given_name') ?? null;
      const groups = await this.getGroupsForUsername(username, userPoolId, client);
      const role = this.groupsToRole(groups);
      return {
        username: out.Username ?? username,
        sub,
        email,
        name,
        role,
        enabled: out.Enabled ?? false,
        userCreateDate: out.UserCreateDate,
        userLastModifiedDate: out.UserLastModifiedDate,
      };
    } catch {
      return null;
    }
  }

  async updateUserAttributes(
    username: string,
    attrs: { name?: string | null; email?: string },
  ): Promise<void> {
    const { userPoolId } = getConfig();
    if (!userPoolId) throw new Error('COGNITO_USER_POOL_ID not configured');
    const client = this.getClient();
    const list: AttributeType[] = [];
    if (attrs.name !== undefined) {
      list.push({ Name: 'name', Value: attrs.name ?? '' });
    }
    if (attrs.email !== undefined) {
      list.push({ Name: 'email', Value: attrs.email });
      list.push({ Name: 'email_verified', Value: 'true' });
      list.push({ Name: 'preferred_username', Value: attrs.email });
    }
    if (list.length === 0) return;
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: list,
      }),
    );
  }

  async deleteUser(username: string): Promise<void> {
    const { userPoolId } = getConfig();
    if (!userPoolId) throw new Error('COGNITO_USER_POOL_ID not configured');
    const client = this.getClient();
    await client.send(
      new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      }),
    );
  }
}
