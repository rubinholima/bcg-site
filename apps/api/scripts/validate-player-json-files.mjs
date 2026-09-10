import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');

const files = fs.readdirSync(dir).filter((f) => f.startsWith('start-m') && f.endsWith('.json')).sort();
const issues = [];
const perFile = [];

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const p = JSON.parse(raw);
  const pr = p.practiceInteractions?.length ?? 0;
  let micro = 0;
  for (const arr of Object.values(p.stepScreens ?? {})) {
    if (Array.isArray(arr)) micro += arr.length;
  }
  const learn = p.stepScreens?.learn?.length ?? 0;
  const ctx = p.stepScreens?.context?.length ?? 0;
  const isChallenge = f.includes('challenge') || f.includes('final-mission');

  if (p.version !== 2) issues.push(`${f}: not v2`);
  if (!p.mission?.production) issues.push(`${f}: no production mission`);
  if (pr < (isChallenge ? 10 : 8)) issues.push(`${f}: practice ${pr}`);
  if (learn < (isChallenge ? 5 : 6)) issues.push(`${f}: learn ${learn}`);
  if (ctx < (isChallenge ? 6 : 4)) issues.push(`${f}: context ${ctx}`);
  if (/audioKey|\[audio:/i.test(raw)) issues.push(`${f}: audio placeholder`);
  if (/fake.*audio|listened to audio/i.test(raw)) issues.push(`${f}: fake audio claim`);

  perFile.push({ f, v: p.version, ctx, learn, pr, micro, prod: Boolean(p.mission?.production) });
}

console.log(JSON.stringify({
  fileCount: files.length,
  allV2: perFile.every((x) => x.v === 2),
  totalMicro: perFile.reduce((s, x) => s + x.micro, 0),
  totalPractice: perFile.reduce((s, x) => s + x.pr, 0),
  issueCount: issues.length,
  issues,
  perFile,
}, null, 2));
