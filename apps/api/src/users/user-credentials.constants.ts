import { randomBytes } from 'crypto';

/** Gera senha temporária aleatória (usuário troca no primeiro login). */
export function generateTemporaryPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export const RUBINHO_EMAIL = 'rl@bostoncitygroup.biz';
export const RUBINHO_USERNAME = 'rubinholima';
