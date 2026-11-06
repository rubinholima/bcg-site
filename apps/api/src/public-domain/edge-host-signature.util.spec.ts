import { createHmac } from 'crypto';
import { verifyEdgePublicHostSignature } from './edge-host-signature.util';

describe('edge-host-signature', () => {
  const secret = 'test-secret-min-16bytes';

  it('accepts valid signature', () => {
    const host = 'www.example.com';
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = `${ts}.${host}`;
    const sig = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    expect(verifyEdgePublicHostSignature(secret, ts, sig, host)).toBe('www.example.com');
  });

  it('rejects tampered host', () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = `${ts}.www.example.com`;
    const sig = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    expect(verifyEdgePublicHostSignature(secret, ts, sig, 'evil.com')).toBeNull();
  });
});
