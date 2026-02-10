import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class VaultEncryptionService {
  private getMasterKey(): Buffer {
    const raw = process.env.VAULT_MASTER_KEY;
    const keyHex = typeof raw === 'string' ? raw.trim().replace(/\s/g, '') : '';
    if (!keyHex || keyHex.length < 64) {
      throw new Error('VAULT_MASTER_KEY must be set and at least 32 bytes (64 hex chars)');
    }
    return Buffer.from(keyHex.slice(0, 64), 'hex');
  }

  encrypt(plaintext: string): { encrypted: string; iv: string } {
    const key = this.getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([enc, tag]);
    return {
      encrypted: combined.toString('base64'),
      iv: iv.toString('hex'),
    };
  }

  decrypt(encryptedBase64: string, ivHex: string): string {
    const key = this.getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const combined = Buffer.from(encryptedBase64, 'base64');
    if (combined.length < TAG_LENGTH) {
      throw new Error('Invalid encrypted payload');
    }
    const enc = combined.subarray(0, combined.length - TAG_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  }
}
