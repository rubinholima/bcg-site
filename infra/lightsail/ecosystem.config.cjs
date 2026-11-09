/**
 * PM2 — injeta env canônico de bcg-site-shared (sobrevive restart/reboot via deploy + pm2 save).
 */
const fs = require('fs');
const path = require('path');

const SHARED = process.env.BCG_SHARED || '/home/ubuntu/bcg-site-shared';
const WORK_TREE = process.env.BCG_WORK_TREE || '/home/ubuntu/bcg-site';

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function mergeEnv(...parts) {
  return Object.assign({}, ...parts);
}

const apiEnv = mergeEnv(parseEnvFile(path.join(SHARED, 'api.env')));
const webEnv = mergeEnv(
  parseEnvFile(path.join(SHARED, 'web.env')),
  parseEnvFile(path.join(SHARED, 'web.env.production')),
);

const apiMain = fs.existsSync(path.join(WORK_TREE, 'apps/api/dist/main.js'))
  ? 'dist/main.js'
  : 'dist/src/main.js';

module.exports = {
  apps: [
    {
      name: 'bcg-api',
      cwd: path.join(WORK_TREE, 'apps/api'),
      script: apiMain,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ...apiEnv,
      },
    },
    {
      name: 'bcg-web',
      cwd: path.join(WORK_TREE, 'apps/web'),
      script: 'pnpm',
      args: 'start',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ...webEnv,
      },
    },
  ],
};
