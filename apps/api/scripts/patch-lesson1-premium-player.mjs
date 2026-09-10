/**
 * Injeta liveMeta.player na lição piloto do manifest (local editorial).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(
  __dirname,
  '../src/desenvolvimento/content/manifests/cup360-english-start-v1.json',
);
const playerPath = path.join(
  __dirname,
  '../src/desenvolvimento/content/manifests/player-data/start-m01-l01-hello.json',
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const player = JSON.parse(fs.readFileSync(playerPath, 'utf8'));

manifest.manifestVersion = '1.1.2';
const lesson = manifest.modules[0].lessons.find((l) => l.contentKey === 'start-m01-l01-hello');
if (!lesson) throw new Error('Lição piloto não encontrada no manifest.');
lesson.live = { ...lesson.live, player };

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('Manifest v1.1.2 — liveMeta.player injetado em start-m01-l01-hello');
