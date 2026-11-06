import {
  normalizePublicHostname,
  PublicDomainHostnameError,
  verificationTxtRecordName,
} from './public-domain.hostname.util';

describe('normalizePublicHostname', () => {
  it('lowercase e remove esquema', () => {
    expect(normalizePublicHostname('HTTPS://WWW.Example.COM')).toBe('www.example.com');
  });

  it('remove path, query e fragmento', () => {
    expect(normalizePublicHostname('example.com/foo?x=1#h')).toBe('example.com');
  });

  it('remove porta', () => {
    expect(normalizePublicHostname('www.example.com:443')).toBe('www.example.com');
  });

  it('remove ponto DNS final', () => {
    expect(normalizePublicHostname('www.example.com.')).toBe('www.example.com');
  });

  it('IDNA (unicode → punycode)', () => {
    expect(normalizePublicHostname('çafe.com.br')).toBe('xn--afe-1la.com.br');
  });

  it('rejeita wildcard', () => {
    expect(() => normalizePublicHostname('*.example.com')).toThrow(PublicDomainHostnameError);
  });

  it('rejeita hostname vazio', () => {
    expect(() => normalizePublicHostname('  ')).toThrow(PublicDomainHostnameError);
  });

  it('rejeita pontos duplos', () => {
    expect(() => normalizePublicHostname('a..b.com')).toThrow(PublicDomainHostnameError);
  });
});

describe('verificationTxtRecordName', () => {
  it('prefixo _cup360-verification', () => {
    expect(verificationTxtRecordName('www.example.com')).toBe('_cup360-verification.www.example.com');
  });
});
