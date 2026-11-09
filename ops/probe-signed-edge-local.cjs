/**
 * Probe local: contrato de borda válido → middleware (não imprime segredo).
 */
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

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
const path = process.argv[3] || '/';
if (!secret) {
  console.log(JSON.stringify({ ok: false, reason: 'no_secret' }));
  process.exit(1);
}

const ts = Math.floor(Date.now() / 1000);
const v = '1';
const payload = `${v}|${ts}|${host}`;
const sig = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

const cmd = [
  'curl',
  '-sI',
  `http://127.0.0.1:3000${path}`,
  '-H',
  'Host: origin.bostoncitygroup.biz',
  '-H',
  `x-cup360-edge-v: ${v}`,
  '-H',
  `x-cup360-edge-ts: ${ts}`,
  '-H',
  `x-cup360-edge-host: ${host}`,
  '-H',
  `x-cup360-edge-sig: ${sig}`,
];

const out = execSync(cmd.join(' '), { encoding: 'utf8' });
const lines = out.split('\n');
const status = lines.find((l) => l.startsWith('HTTP/')) || '';
const auth = lines.find((l) => /^x-middleware-auth:/i.test(l)) || '';
console.log(JSON.stringify({ status: status.trim(), middleware: auth.trim() }));
