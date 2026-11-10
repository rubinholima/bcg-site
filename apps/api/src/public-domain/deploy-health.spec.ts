import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..', '..', '..');

describe('infra/lightsail deploy readiness', () => {
  const deploySh = readFileSync(join(root, 'infra', 'lightsail', 'deploy.sh'), 'utf8');
  const readinessSh = readFileSync(join(root, 'infra', 'lightsail', 'deploy-readiness.sh'), 'utf8');

  it('deploy.sh usa readiness com timeout e exit 1 em falha', () => {
    expect(deploySh).toMatch(/deploy-readiness\.sh/);
    expect(deploySh).toMatch(/deploy_readiness_run_post_pm2/);
    expect(deploySh).toMatch(/exit 1/);
    expect(deploySh).not.toMatch(/até 6 tentativas/);
  });

  it('readiness: poll 3s, max 120s, GET /group + HEAD web + PM2', () => {
    expect(readinessSh).toMatch(/DEPLOY_HEALTH_MAX_WAIT_SEC.*120/);
    expect(readinessSh).toMatch(/DEPLOY_HEALTH_POLL_SEC.*3/);
    expect(readinessSh).toMatch(/3001\/group/);
    expect(readinessSh).toMatch(/3000\//);
    expect(readinessSh).toMatch(/deploy_readiness_pm2_online bcg-api/);
    expect(readinessSh).toMatch(/deploy_readiness_pm2_online bcg-web/);
    expect(readinessSh).toMatch(/deploy_readiness_diagnose_failure/);
  });

  it('não trata falha de API apenas como AVISO', () => {
    expect(deploySh).not.toMatch(/AVISO: API :3001 não respondeu/);
  });
});
