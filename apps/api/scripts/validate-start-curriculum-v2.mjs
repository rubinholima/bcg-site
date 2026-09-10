import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();

const course = await p.learningCourse.findUnique({
  where: { contentKey: 'cup360-english-start-v1' },
  include: {
    modules: {
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: {
          orderBy: { sortOrder: 'asc' },
          include: { quiz: { include: { questions: true } } },
        },
      },
    },
  },
});

const m1Keys = [
  'start-m01-l01-hello',
  'start-m01-l02-my-name-is',
  'start-m01-l03-im-from-brazil',
  'start-m01-l04-what-do-you-do',
  'start-m01-l05-first-conversation',
];

const m1 = course.modules.find((m) => m.contentKey === 'start-module-01-hello');
const m1Lessons = m1?.lessons ?? [];
const lessonKeys = new Set();
let duplicateKeys = 0;
let shellsWithQuiz = 0;
let shellsWithPlayer = 0;

for (const mod of course.modules) {
  for (const l of mod.lessons) {
    if (lessonKeys.has(l.contentKey)) duplicateKeys += 1;
    lessonKeys.add(l.contentKey);
    const isM1 = m1Keys.includes(l.contentKey);
    if (!isM1 && l.quiz) shellsWithQuiz += 1;
    if (!isM1 && l.liveMeta?.player) shellsWithPlayer += 1;
  }
}

const enrollments = await p.learningEnrollment.findMany({
  where: { courseId: course.id },
  include: { lessonProgress: true },
});

const report = {
  manifestVersion: course.manifestVersion,
  courseStatus: course.status,
  totalModules: course.modules.length,
  totalLessons: course.modules.reduce((n, m) => n + m.lessons.length, 0),
  module1: {
    contentKey: m1?.contentKey,
    lessonCount: m1Lessons.length,
    preservedKeys: m1Keys.every((k) => m1Lessons.some((l) => l.contentKey === k)),
    l03PlayerV2: m1Lessons.find((l) => l.contentKey === 'start-m01-l03-im-from-brazil')?.liveMeta?.player?.version === 2,
    quizzesOnM1: m1Lessons.filter((l) => l.quiz).length,
  },
  shells: {
    duplicateContentKeys: duplicateKeys,
    shellsWithQuiz,
    shellsWithPlayer,
  },
  enrollments: enrollments.map((e) => ({
    id: e.id,
    progressPct: e.progressPct,
    lessonProgressCount: e.lessonProgress.length,
    completedLessons: e.lessonProgress.filter((lp) => lp.status === 'completed').length,
  })),
};

console.log(JSON.stringify(report, null, 2));
await p.$disconnect();
