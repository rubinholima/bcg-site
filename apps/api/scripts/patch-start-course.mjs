/**
 * Injeta liveMeta.player + quizzes em TODAS as lições START com player-data.
 * Bump manifestVersion. Não altera M1 player content (re-inject from files).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-start-v1.json');
const playerDataDir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');
const quizzesPath = path.join(__dirname, 'start-content/generated-quizzes.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const quizzes = JSON.parse(fs.readFileSync(quizzesPath, 'utf8'));

manifest.manifestVersion = '3.0.0';
manifest.course.status = 'draft'; // importer maps; DB stays published via existing record

const challengeKeys = new Set(
  manifest.modules.flatMap((m) =>
    m.lessons.filter((l) => l.live?.curriculum?.lessonKind === 'challenge').map((l) => l.contentKey),
  ),
);

const finalMission = 'start-m10-l07-start-final-mission';

let injected = 0;
let quizCount = 0;

for (const mod of manifest.modules) {
  for (const lesson of mod.lessons) {
    const playerPath = path.join(playerDataDir, `${lesson.contentKey}.json`);
    if (!fs.existsSync(playerPath)) continue;

    const player = JSON.parse(fs.readFileSync(playerPath, 'utf8'));
    lesson.live = {
      ...lesson.live,
      methodology: 'LIVE',
      realLifeContext: lesson.live?.realLifeContext ?? lesson.live?.curriculum?.objectivePt ?? '',
      learn: lesson.live?.curriculum?.coreConcepts?.join('; ') ?? '',
      buildPractice: 'Prática guiada Player v2.',
      verify: 'Quiz — conteúdo já ensinado (70%).',
      executeMission: lesson.live?.curriculum?.outcomePt ?? '',
      player,
    };

    const quiz = quizzes[lesson.contentKey];
    if (quiz) {
      lesson.quiz = quiz;
      quizCount += 1;
    }

    if (challengeKeys.has(lesson.contentKey) || lesson.contentKey === finalMission) {
      lesson.estimatedMinutes = lesson.contentKey === finalMission ? 20 : 18;
      if (lesson.live?.curriculum) {
        lesson.live.curriculum.lessonKind = 'challenge';
        lesson.live.curriculum.estimatedMinutes = lesson.estimatedMinutes;
      }
    } else if (!lesson.estimatedMinutes || lesson.estimatedMinutes < 10) {
      lesson.estimatedMinutes = 12;
    }

    injected += 1;
  }
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Manifest ${manifest.manifestVersion} — ${injected} players, ${quizCount} quizzes.`);
