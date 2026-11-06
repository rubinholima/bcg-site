import { filterRecordsSafeForUpsert, isCup360ManagedWebRecord, isProtectedTxtContent } from './aws-route53-record-safety.util';

describe('aws-route53-record-safety', () => {
  const zone = 'example.com.';

  it('allows web CNAME for www', () => {
    expect(isCup360ManagedWebRecord('www.example.com.', 'CNAME', zone)).toBe(true);
  });

  it('blocks MX', () => {
    expect(isCup360ManagedWebRecord('example.com.', 'MX', zone)).toBe(false);
  });

  it('blocks DKIM-style names', () => {
    expect(isCup360ManagedWebRecord('selector1._domainkey.example.com.', 'CNAME', zone)).toBe(false);
  });

  it('detects SPF in TXT', () => {
    expect(isProtectedTxtContent('"v=spf1 include:_spf.google.com ~all"')).toBe(true);
  });

  it('filterRecordsSafeForUpsert drops bad TXT', () => {
    const ok = filterRecordsSafeForUpsert(zone, [
      { Name: 'www.example.com.', Type: 'A' },
      { Name: 'example.com.', Type: 'TXT', ResourceRecords: [{ Value: '"v=spf1 -all"' }] },
    ]);
    expect(ok).toHaveLength(1);
  });
});
