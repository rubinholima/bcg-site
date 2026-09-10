/**
 * Injeta liveMeta.player em todas as lições do Módulo 1 com arquivo player-data correspondente.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(
  __dirname,
  '../src/desenvolvimento/content/manifests/cup360-english-start-v1.json',
);
const playerDataDir = path.join(
  __dirname,
  '../src/desenvolvimento/content/manifests/player-data',
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.manifestVersion = '1.1.4';

const module1 = manifest.modules[0];
if (!module1) throw new Error('Módulo 1 não encontrado.');

let injected = 0;
for (const lesson of module1.lessons) {
  const playerPath = path.join(playerDataDir, `${lesson.contentKey}.json`);
  if (!fs.existsSync(playerPath)) continue;
  const player = JSON.parse(fs.readFileSync(playerPath, 'utf8'));
  lesson.live = { ...lesson.live, player };
  injected += 1;
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Manifest v1.1.3 — liveMeta.player injetado em ${injected} lição(ões).`);
