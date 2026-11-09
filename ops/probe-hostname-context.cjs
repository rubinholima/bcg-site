const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const SHARED = process.env.BCG_SHARED || '/home/ubuntu/bcg-site-shared';

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const secret = parseEnvFile(`${SHARED}/api.env`).CUP360_EDGE_HOST_SECRET;
const host = process.argv[2] || 'www.bostoncityfc.com';
const ts = Math.floor(Date.now() / 1000);
const v = '1';
const payload = `${v}|${ts}|${host}`;
const sig = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

const url = `http://127.0.0.1:3001/public/hostname-context?host=${encodeURIComponent(host)}&pathname=/`;
const args = [
  '-s',
  '-w',
  '\nHTTP:%{http_code}',
  url,
  '-H',
  `x-cup360-edge-v: ${v}`,
  '-H',
  `x-cup360-edge-ts: ${ts}`,
  '-H',
  `x-cup360-edge-host: ${host}`,
  '-H',
  `x-cup360-edge-sig: ${sig}`,
];
const out = spawnSync('curl', args, { encoding: 'utf8', timeout: 15000 });
console.log((out.stdout || out.stderr || '').slice(0, 500));
