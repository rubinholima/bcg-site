/**
 * Injeta liveMeta.player + quizzes em TODAS as lições ELEMENTARY com player-data.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-elementary-v1.json');
const playerDataDir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');
const quizzesPath = path.join(__dirname, 'elementary-content/generated-quizzes.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const quizzes = JSON.parse(fs.readFileSync(quizzesPath, 'utf8'));

const challengeKeys = new Set(
  manifest.modules.flatMap((m) =>
    m.lessons.filter((l) => l.live?.curriculum?.lessonKind === 'challenge').map((l) => l.contentKey),
  ),
);

const finalMission = 'elem-m10-l07-final-elementary-mission';

let injected = 0;
let quizCount = 0;
let missing = [];

for (const mod of manifest.modules) {
  for (const lesson of mod.lessons) {
    const playerPath = path.join(playerDataDir, `${lesson.contentKey}.json`);
    if (!fs.existsSync(playerPath)) {
      missing.push(lesson.contentKey);
      continue;
    }

    const player = JSON.parse(fs.readFileSync(playerPath, 'utf8'));
    lesson.live = {
      ...lesson.live,
      methodology: 'LIVE',
      realLifeContext: lesson.live?.realLifeContext ?? lesson.live?.curriculum?.objectivePt ?? '',
      learn: lesson.live?.curriculum?.coreConcepts?.join('; ') ?? player.goalPt ?? '',
      buildPractice: 'Prática guiada Player v2.',
      verify: 'Quiz — conteúdo já ensinado (70%).',
      executeMission: lesson.live?.curriculum?.outcomePt ?? player.goalPt ?? '',
      player,
    };

    const quiz = quizzes[lesson.contentKey];
    if (quiz) {
      lesson.quiz = quiz;
      quizCount += 1;
    }

    if (challengeKeys.has(lesson.contentKey) || lesson.contentKey === finalMission) {
      lesson.estimatedMinutes = lesson.contentKey === finalMission ? 22 : 18;
      if (lesson.live?.curriculum) {
        lesson.live.curriculum.lessonKind = 'challenge';
        lesson.live.curriculum.estimatedMinutes = lesson.estimatedMinutes;
      }
    } else if (!lesson.estimatedMinutes || lesson.estimatedMinutes < 10) {
      lesson.estimatedMinutes = 14;
    }

    injected += 1;
  }
}

if (missing.length) {
  console.error('Players ausentes:', missing);
  process.exit(1);
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Manifest ${manifest.manifestVersion} — ${injected} players, ${quizCount} quizzes.`);
