import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();

const COURSE_KEY = 'cup360-english-start-v1';
const playerDir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');
const manifestPath = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-start-v1.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const curriculumModuleKeys = new Set(manifest.modules.map((m) => m.contentKey));

const course = await p.learningCourse.findUnique({
  where: { contentKey: COURSE_KEY },
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

if (!course) throw new Error('Curso não encontrado');

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

const moduleSummaries = [];

for (const mod of course.modules) {
  let modV2 = 0;
  let modLessons = mod.lessons.length;
  for (const l of mod.lessons) {
    if (lessonKeys.has(l.contentKey)) dupLesson += 1;
    lessonKeys.add(l.contentKey);

    const player = l.liveMeta?.player;
    const isChallenge =
      l.contentKey.includes('challenge') || l.contentKey.includes('final-mission');

    if (player?.version !== 2) {
      notV2 += 1;
      shells += 1;
    } else {
      modV2 += 1;
      const pr = player.practiceInteractions?.length ?? 0;
      totalPractice += pr;
      if (pr < (isChallenge ? 10 : 8)) lowPractice += 1;
      if (!player.mission?.production) noProduction += 1;
      const raw = JSON.stringify(player);
      if (/audioKey|\[audio:/i.test(raw)) audioInPlayer += 1;
      for (const arr of Object.values(player.stepScreens ?? {})) {
        if (Array.isArray(arr)) totalMicro += arr.length;
      }
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

const diskFiles = fs
  .readdirSync(playerDir)
  .filter((f) => f.startsWith('start-m') && f.endsWith('.json'));

const enrollments = await p.learningEnrollment.findMany({
  where: { course: { contentKey: COURSE_KEY } },
  include: {
    lessonProgress: true,
    _count: { select: { quizAttempts: true } },
  },
});

const report = {
  manifestVersion: course.manifestVersion,
  courseStatus: course.status,
  curriculumModules: course.modules.length,
  totalLessons: [...lessonKeys].length,
  playerJsonOnDisk: diskFiles.length,
  playerV2Coverage: `${[...lessonKeys].length - notV2}/${[...lessonKeys].length}`,
  allPlayerV2: notV2 === 0,
  zeroShells: shells === 0,
  duplicateLessonKeys: dupLesson,
  duplicateQuizKeys: dupQuiz,
  noProduction,
  lowPractice,
  audioInPlayer,
  invalidPassing,
  totalMicroScreens: totalMicro,
  totalPracticeInteractions: totalPractice,
  totalGradedQuestions: totalGraded,
  moduleSummaries,
  enrollments: enrollments.map((e) => ({
    progressPct: e.progressPct,
    lessonProgress: e.lessonProgress.length,
    quizAttempts: e._count.quizAttempts,
  })),
  pass:
    course.modules.length === manifest.modules.length &&
    [...lessonKeys].length === 65 &&
    notV2 === 0 &&
    dupLesson === 0 &&
    dupQuiz === 0 &&
    noProduction === 0 &&
    audioInPlayer === 0 &&
    invalidPassing === 0 &&
    diskFiles.length === 65,
};

console.log(JSON.stringify(report, null, 2));
await p.$disconnect();
process.exit(report.pass ? 0 : 1);
