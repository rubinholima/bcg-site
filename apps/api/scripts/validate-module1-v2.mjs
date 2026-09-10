import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();

const keys = [
  'start-m01-l01-hello',
  'start-m01-l02-my-name-is',
  'start-m01-l03-im-from-brazil',
  'start-m01-l04-what-do-you-do',
  'start-m01-l05-first-conversation',
];

const m1 = await p.learningCourseModule.findFirst({
  where: { contentKey: 'start-module-01-hello' },
  include: {
    lessons: {
      where: { contentKey: { in: keys } },
      orderBy: { sortOrder: 'asc' },
      include: { quiz: { include: { questions: true } } },
    },
  },
});

const qKeys = new Set();
let dupQ = 0;
let htmlFallback = 0;
let audioInHtml = 0;

const lessons = m1.lessons.map((l) => {
  for (const q of l.quiz?.questions ?? []) {
    if (qKeys.has(q.contentKey)) dupQ += 1;
    qKeys.add(q.contentKey);
  }
  if (l.contentHtml && l.liveMeta?.player?.version === 2) htmlFallback += 1;
  if (/\[áudio:|\[audio:/i.test(l.contentHtml ?? '')) audioInHtml += 1;
  const pi = l.liveMeta?.player?.practiceInteractions?.length ?? l.liveMeta?.player?.practice?.items?.length ?? 0;
  const ctx = l.liveMeta?.player?.stepScreens?.context?.length ?? 0;
  const learn = l.liveMeta?.player?.stepScreens?.learn?.length ?? 0;
  return {
    contentKey: l.contentKey,
    playerV: l.liveMeta?.player?.version,
    ctx,
    learn,
    practice: pi,
    quizQ: l.quiz?.questions?.length ?? 0,
    hasProduction: Boolean(l.liveMeta?.player?.mission?.production),
  };
});

const course = await p.learningCourse.findUnique({
  where: { contentKey: 'cup360-english-start-v1' },
  select: { manifestVersion: true, status: true },
});

const enrollments = await p.learningEnrollment.findMany({
  where: { course: { contentKey: 'cup360-english-start-v1' } },
  include: { lessonProgress: true, _count: { select: { quizAttempts: true } } },
});

console.log(JSON.stringify({
  manifestVersion: course?.manifestVersion,
  courseStatus: course?.status,
  allPlayerV2: lessons.every((l) => l.playerV === 2),
  lessons,
  duplicateQuizKeys: dupQ,
  lessonsWithHtmlAndV2Player: htmlFallback,
  audioPlaceholdersInHtml: audioInHtml,
  totalGradedQuestions: [...qKeys].length,
  enrollments: enrollments.map((e) => ({
    progressPct: e.progressPct,
    lessonProgress: e.lessonProgress.length,
    quizAttempts: e._count.quizAttempts,
  })),
}, null, 2));

await p.$disconnect();
