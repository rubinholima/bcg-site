import { readFileSync } from 'fs';
import { join } from 'path';

describe('infra/lightsail/deploy.sh — health checks obrigatórios', () => {
  const deploySh = readFileSync(
    join(__dirname, '..', '..', '..', '..', 'infra', 'lightsail', 'deploy.sh'),
    'utf8',
  );

  it('falha API health com exit 1', () => {
    expect(deploySh).toMatch(/GET \/group/);
    expect(deploySh).toMatch(/HEALTH_OK=0/);
    expect(deploySh).toMatch(/ERRO: API :3001/);
    expect(deploySh).toMatch(/exit 1/);
  });

  it('falha Web health com exit 1', () => {
    expect(deploySh).toMatch(/WEB_HEALTH_OK/);
    expect(deploySh).toMatch(/127\.0\.0\.1:3000/);
    expect(deploySh).toMatch(/ERRO: Web :3000/);
  });

  it('não trata falha de API apenas como AVISO', () => {
    expect(deploySh).not.toMatch(/AVISO: API :3001 não respondeu/);
  });
});
