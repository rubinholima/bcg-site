/**
 * Generate Elementary M9 & M10 Player v2 JSON files.
 * Run: node apps/api/scripts/elementary-content/generate-m09-m10.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPlayer } from './build-lesson.mjs';
import { LESSONS_M09, LESSONS_M10, FINAL_MISSION_EXTRAS } from './lessons-m09-m10.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../src/desenvolvimento/content/manifests/player-data');

export function pfx(contentKey) {
  const m = contentKey.match(/elem-m(\d+)-l(\d+)/);
  return m ? `em${m[1]}l${m[2]}` : contentKey.slice(-10);
}

export function fixIds(obj, contentKey) {
  const m = contentKey.match(/elem-m(\d+)-l(\d+)/);
  if (!m) return obj;
  const oldPfx = `em${m[1]}-l${m[2]}`;
  const newPfx = `em${m[1]}l${m[2]}`;
  return JSON.parse(JSON.stringify(obj).replaceAll(oldPfx, newPfx));
}

function finalizePlayer(def) {
  let player = buildPlayer(def);
  player = fixIds(player, def.contentKey);
  const prefix = pfx(def.contentKey);

  if (def.learnOverride) {
    player.stepScreens.learn = def.learnOverride(prefix);
  }
  if (def.missionScreens) {
    player.stepScreens.mission = def.missionScreens(prefix);
  }
  if (def.finalMission && FINAL_MISSION_EXTRAS) {
    const extras = FINAL_MISSION_EXTRAS(prefix);
    if (extras.learn) player.stepScreens.learn = extras.learn;
    if (extras.mission) player.stepScreens.mission = extras.mission;
    if (extras.production) {
      player.mission.production = { ...player.mission.production, ...extras.production };
    }
  }

  delete player._meta;
  return player;
}

mkdirSync(OUT, { recursive: true });

const ALL = [...LESSONS_M09, ...LESSONS_M10];
const created = [];

for (const def of ALL) {
  const player = finalizePlayer(def);
  const filename = `${def.contentKey}.json`;
  writeFileSync(join(OUT, filename), `${JSON.stringify(player, null, 2)}\n`, 'utf8');
  created.push(filename);
}

console.log(`Created ${created.length} files in ${OUT}:`);
for (const f of created) console.log(`  ✓ ${f}`);
