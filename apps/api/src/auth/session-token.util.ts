import { UnauthorizedException } from '@nestjs/common';

/** Sessões simultâneas permitidas apenas para super_admin. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin';
}

export function resolveTokenVersionFromPayload(payload: {
  tokenVersion?: number;
}): number {
  return typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0;
}

export function assertTokenVersionMatches(
  payloadVersion: number,
  userTokenVersion: number,
): void {
  if (payloadVersion !== userTokenVersion) {
    throw new UnauthorizedException('Sessão encerrada — faça login novamente.');
  }
}
