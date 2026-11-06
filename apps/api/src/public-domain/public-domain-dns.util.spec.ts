import { hostnamesForCertificate } from './public-domain-dns.util';

describe('public-domain-dns', () => {
  it('adds paired www/apex', () => {
    const h = hostnamesForCertificate('www.clube.com.br', ['clube.com.br', 'www.clube.com.br']);
    expect(h.sort()).toEqual(['clube.com.br', 'www.clube.com.br'].sort());
  });

  it('single hostname when pair missing', () => {
    expect(hostnamesForCertificate('blog.clube.com', ['blog.clube.com'])).toEqual(['blog.clube.com']);
  });
});
