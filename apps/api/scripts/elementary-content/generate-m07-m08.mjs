#!/usr/bin/env node
/** Generate Player v2 JSON — Elementary Modules 7–8 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildPlayer } from './build-lesson.mjs';
import { LESSONS } from './lessons-m07-m08.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../../src/desenvolvimento/content/manifests/player-data');

mkdirSync(OUT_DIR, { recursive: true });

const written = [];

for (const def of LESSONS) {
  const player = buildPlayer(def);
  delete player._meta;
  const filename = `${def.contentKey}.json`;
  const filepath = join(OUT_DIR, filename);
  writeFileSync(filepath, JSON.stringify(player, null, 2) + '\n', 'utf8');
  written.push(filename);
}

console.log(`Generated ${written.length} files in ${OUT_DIR}:`);
written.forEach((f) => console.log(`  ${f}`));
