/**
 * Validador Elementary + integridade START inalterado.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();

const ELEM_COURSE_KEY = 'cup360-english-elementary-v1';
const START_COURSE_KEY = 'cup360-english-start-v1';
const EXPECTED_LESSONS = 69;

const playerDir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');
const elemManifestPath = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-elementary-v1.json');
const startManifestPath = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-start-v1.json');

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// START integrity — manifest version and lesson count on disk
const startManifest = JSON.parse(fs.readFileSync(startManifestPath, 'utf8'));
const startDiskFiles = fs.readdirSync(playerDir).filter((f) => f.startsWith('start-m') && f.endsWith('.json'));
const startLessonKeysFromManifest = new Set(
  startManifest.modules.flatMap((m) => m.lessons.map((l) => l.contentKey)),
);

const startIntegrity = {
  manifestVersion: startManifest.manifestVersion,
  expectedManifestVersion: '3.0.0',
  manifestVersionOk: startManifest.manifestVersion === '3.0.0',
  diskPlayerFiles: startDiskFiles.length,
  expectedDiskFiles: 65,
  diskFilesOk: startDiskFiles.length === 65,
  manifestLessonKeys: startLessonKeysFromManifest.size,
  expectedManifestLessons: 65,
  manifestLessonsOk: startLessonKeysFromManifest.size === 65,
  pass:
    startManifest.manifestVersion === '3.0.0' &&
    startDiskFiles.length === 65 &&
    startLessonKeysFromManifest.size === 65,
};

const elemManifest = JSON.parse(fs.readFileSync(elemManifestPath, 'utf8'));
const curriculumModuleKeys = new Set(elemManifest.modules.map((m) => m.contentKey));

const course = await p.learningCourse.findUnique({
  where: { contentKey: ELEM_COURSE_KEY },
  include: {
    modules: {
      where: { contentKey: { in: [...curriculumModuleKeys] } },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: {
          orderBy: { sortOrder: 'asc' },
          include: { quiz: { include: { questions: { orderBy: { sortOrder: 'asc' } } } } },
        },
      },
    },
  },
});

const diskElemFiles = fs.readdirSync(playerDir).filter((f) => f.startsWith('elem-m') && f.endsWith('.json'));

const lessonKeys = new Set();
const quizKeys = new Set();
let dupLesson = 0;
let dupQuiz = 0;
let shells = 0;
let notV2 = 0;
let noProduction = 0;
let lowPractice = 0;
let audioInPlayer = 0;
let invalidPassing = 0;
let totalMicro = 0;
let totalPractice = 0;
let totalGraded = 0;
let wrongLevel = 0;

const moduleSummaries = [];

function validatePlayerOnDisk(contentKey) {
  const fp = path.join(playerDir, `${contentKey}.json`);
  if (!fs.existsSync(fp)) return { ok: false, reason: 'missing_disk' };
  const player = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (player.version !== 2) return { ok: false, reason: 'not_v2' };
  if (player.levelLabel !== 'ELEMENTARY') return { ok: false, reason: 'wrong_level' };
  const raw = JSON.stringify(player);
  if (/audioKey|\[audio:/i.test(raw)) return { ok: false, reason: 'audio' };
  if (!player.mission?.production) return { ok: false, reason: 'no_production' };
  const pr = player.practiceInteractions?.length ?? 0;
  const isChallenge = contentKey.includes('challenge') || contentKey.includes('final-elementary-mission');
  if (pr < (isChallenge ? 10 : 8)) return { ok: false, reason: 'low_practice', pr };
  if (!player.stepScreens?.context?.length && !player.stepScreens?.learn?.length) {
    return { ok: false, reason: 'shell' };
  }
  let micro = 0;
  for (const arr of Object.values(player.stepScreens ?? {})) {
    if (Array.isArray(arr)) micro += arr.length;
  }
  return { ok: true, pr, micro };
}

const diskReport = { ok: 0, issues: [] };
for (const mod of elemManifest.modules) {
  for (const l of mod.lessons) {
    const r = validatePlayerOnDisk(l.contentKey);
    if (r.ok) {
      diskReport.ok += 1;
      totalPractice += r.pr;
      totalMicro += r.micro;
    } else {
      diskReport.issues.push({ contentKey: l.contentKey, ...r });
    }
  }
}

if (course) {
  for (const mod of course.modules) {
    let modV2 = 0;
    const modLessons = mod.lessons.length;
    for (const l of mod.lessons) {
      if (lessonKeys.has(l.contentKey)) dupLesson += 1;
      lessonKeys.add(l.contentKey);

      const player = l.liveMeta?.player;
      const isChallenge =
        l.contentKey.includes('challenge') || l.contentKey.includes('final-elementary-mission');

      if (player?.version !== 2) {
        notV2 += 1;
        shells += 1;
      } else {
        modV2 += 1;
        if (player.levelLabel !== 'ELEMENTARY') wrongLevel += 1;
        const pr = player.practiceInteractions?.length ?? 0;
        totalPractice = Math.max(totalPractice, 0); // recount from DB below
        if (pr < (isChallenge ? 10 : 8)) lowPractice += 1;
        if (!player.mission?.production) noProduction += 1;
        const raw = JSON.stringify(player);
        if (/audioKey|\[audio:/i.test(raw)) audioInPlayer += 1;
      }

      if (!player?.stepScreens?.context?.length && !player?.stepScreens?.learn?.length) shells += 1;

      for (const q of l.quiz?.questions ?? []) {
        if (quizKeys.has(q.contentKey)) dupQuiz += 1;
        quizKeys.add(q.contentKey);
        totalGraded += 1;
      }

      if (l.quiz && l.quiz.passingScore !== 70) invalidPassing += 1;
    }
    moduleSummaries.push({
      contentKey: mod.contentKey,
      title: mod.title,
      lessons: modLessons,
      playerV2: modV2,
    });
  }

  // Recount from DB
  totalMicro = 0;
  totalPractice = 0;
  for (const mod of course.modules) {
    for (const l of mod.lessons) {
      const player = l.liveMeta?.player;
      if (player?.version === 2) {
        totalPractice += player.practiceInteractions?.length ?? 0;
        for (const arr of Object.values(player.stepScreens ?? {})) {
          if (Array.isArray(arr)) totalMicro += arr.length;
        }
      }
    }
  }
}

const challenges = elemManifest.modules.flatMap((m) =>
  m.lessons.filter((l) => l.contentKey.includes('challenge') || l.contentKey.includes('final-elementary-mission')).map((l) => l.contentKey),
);

const report = {
  course: ELEM_COURSE_KEY,
  manifestVersion: elemManifest.manifestVersion,
  courseInDb: !!course,
  courseStatus: course?.status ?? 'not_imported',
  curriculumModules: elemManifest.modules.length,
  expectedModules: 10,
  totalLessonsManifest: elemManifest.modules.reduce((n, m) => n + m.lessons.length, 0),
  totalLessonsDb: course ? [...lessonKeys].length : 0,
  playerJsonOnDisk: diskElemFiles.length,
  diskValidation: {
    lessonsOk: diskReport.ok,
    issues: diskReport.issues.length,
    issuesSample: diskReport.issues.slice(0, 5),
  },
  playerV2Coverage: course ? `${[...lessonKeys].length - notV2}/${[...lessonKeys].length}` : `${diskReport.ok}/${EXPECTED_LESSONS}`,
  allPlayerV2: course ? notV2 === 0 : diskReport.ok === EXPECTED_LESSONS,
  zeroShells: course ? shells === 0 : diskReport.issues.filter((i) => i.reason === 'shell').length === 0,
  duplicateLessonKeys: dupLesson,
  duplicateQuizKeys: dupQuiz,
  noProduction: course ? noProduction : diskReport.issues.filter((i) => i.reason === 'no_production').length,
  lowPractice: course ? lowPractice : diskReport.issues.filter((i) => i.reason === 'low_practice').length,
  wrongLevelLabel: wrongLevel,
  audioInPlayer,
  invalidPassing,
  totalMicroScreens: totalMicro,
  totalPracticeInteractions: totalPractice,
  totalGradedQuestions: totalGraded,
  moduleSummaries: course
    ? moduleSummaries
    : elemManifest.modules.map((m) => ({
        contentKey: m.contentKey,
        title: m.title,
        lessons: m.lessons.length,
      })),
  challenges,
  finalElementaryMission: 'elem-m10-l07-final-elementary-mission',
  startIntegrityCheck: startIntegrity,
  pass:
    elemManifest.modules.length === 10 &&
    elemManifest.modules.reduce((n, m) => n + m.lessons.length, 0) === EXPECTED_LESSONS &&
    diskElemFiles.length === EXPECTED_LESSONS &&
    diskReport.ok === EXPECTED_LESSONS &&
    diskReport.issues.length === 0 &&
    startIntegrity.pass &&
    (course
      ? [...lessonKeys].length === EXPECTED_LESSONS &&
        notV2 === 0 &&
        dupLesson === 0 &&
        dupQuiz === 0 &&
        noProduction === 0 &&
        audioInPlayer === 0 &&
        invalidPassing === 0 &&
        wrongLevel === 0
      : true),
};

console.log(JSON.stringify(report, null, 2));
await p.$disconnect();
process.exit(report.pass ? 0 : 1);
