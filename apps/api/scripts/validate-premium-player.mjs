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

const lessons = await p.learningLesson.findMany({
  where: { contentKey: { in: keys } },
  include: { quiz: { include: { questions: true } } },
  orderBy: { sortOrder: 'asc' },
});

const course = await p.learningCourse.findUnique({
  where: { contentKey: 'cup360-english-start-v1' },
  select: { manifestVersion: true, status: true },
});

const report = {
  manifestVersion: course?.manifestVersion,
  courseStatus: course?.status,
  lessons: lessons.map((l) => ({
    contentKey: l.contentKey,
    title: l.title,
    hasPlayer: Boolean(l.liveMeta?.player),
    playerSteps: l.liveMeta?.player?.steps?.length ?? 0,
    practiceItems: l.liveMeta?.player?.practice?.items?.length ?? 0,
    quizQuestions: l.quiz?.questions?.length ?? 0,
    contentHtmlHasAudioPlaceholder: /\[áudio:|\[audio:/i.test(l.contentHtml ?? ''),
  })),
  allHavePlayer: lessons.every((l) => Boolean(l.liveMeta?.player)),
  quizIdsUnique: new Set(lessons.flatMap((l) => l.quiz?.questions?.map((q) => q.contentKey) ?? [])).size,
};

const l3 = lessons.find((l) => l.contentKey === 'start-m01-l03-im-from-brazil');
report.lesson3Deep = {
  version: l3?.liveMeta?.player?.version,
  contextScreens: l3?.liveMeta?.player?.stepScreens?.context?.length ?? 0,
  learnScreens: l3?.liveMeta?.player?.stepScreens?.learn?.length ?? 0,
  practiceInteractions: l3?.liveMeta?.player?.practiceInteractions?.length ?? 0,
  quizQuestions: l3?.quiz?.questions?.length ?? 0,
};

console.log(JSON.stringify(report, null, 2));
await p.$disconnect();
