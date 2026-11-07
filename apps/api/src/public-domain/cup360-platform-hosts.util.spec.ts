import { isCup360PlatformHostname } from './cup360-platform-hosts.util';

describe('cup360-platform-hosts.util', () => {
  const platformHosts = [
    'www.bostoncitygroup.biz',
    'bostoncitygroup.biz',
    'origin.bostoncitygroup.biz',
    'auth.bostoncitygroup.biz',
    'api.bostoncitygroup.biz',
    'localhost',
    '127.0.0.1',
  ];

  it.each(platformHosts)('%s é host de plataforma', (host) => {
    expect(isCup360PlatformHostname(host)).toBe(true);
    expect(isCup360PlatformHostname(`https://${host}/`)).toBe(true);
  });

  it('domínio de cliente não é plataforma', () => {
    expect(isCup360PlatformHostname('www.customer.com')).toBe(false);
  });
});
