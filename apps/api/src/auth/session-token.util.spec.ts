import { UnauthorizedException } from '@nestjs/common';
import {
  assertTokenVersionMatches,
  isSuperAdminRole,
  resolveTokenVersionFromPayload,
} from './session-token.util';

describe('session-token.util', () => {
  it('isSuperAdminRole reconhece super_admin', () => {
    expect(isSuperAdminRole('super_admin')).toBe(true);
    expect(isSuperAdminRole('editor')).toBe(false);
  });

  it('resolveTokenVersionFromPayload usa 0 quando ausente', () => {
    expect(resolveTokenVersionFromPayload({})).toBe(0);
    expect(resolveTokenVersionFromPayload({ tokenVersion: 3 })).toBe(3);
  });

  it('assertTokenVersionMatches rejeita versão stale', () => {
    expect(() => assertTokenVersionMatches(0, 1)).toThrow(UnauthorizedException);
    expect(() => assertTokenVersionMatches(2, 2)).not.toThrow();
  });
});
