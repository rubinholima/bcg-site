import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  LearningContentImportResult,
  LearningContentImportStats,
  LearningContentLessonManifest,
  LearningContentManifest,
  LearningLiveMeta,
} from './learning-content.types';
import { validateLearningContentManifest } from './learning-content.validate';

type Db = PrismaService | PrismaClient;

function buildLiveMeta(
  live: LearningContentLessonManifest['live'],
  methodology?: 'LIVE',
): Prisma.InputJsonValue | undefined {
  if (!live && !methodology) return undefined;
  const meta: LearningLiveMeta = {
    ...(live ?? {}),
    methodology: live?.methodology ?? methodology,
  };
  return meta as Prisma.InputJsonValue;
}

function mediaToLessonFields(lesson: LearningContentLessonManifest) {
  const video = lesson.video;
  const audio = lesson.audio;
  const document = lesson.document;
  const media = video ?? audio ?? document;
  return {
    fileKey: media?.key ?? undefined,
    fileUrl: media?.url ?? undefined,
    mimeType: media?.mimeType ?? undefined,
    externalUrl: lesson.externalUrl ?? undefined,
  };
}

export async function importLearningContentManifest(
  db: Db,
  rawManifest: LearningContentManifest,
): Promise<LearningContentImportResult> {
  const manifest = validateLearningContentManifest(rawManifest);
  const stats: LearningContentImportStats = {
    courseCreated: false,
    courseUpdated: false,
    modulesCreated: 0,
    modulesUpdated: 0,
    lessonsCreated: 0,
    lessonsUpdated: 0,
    quizzesUpserted: 0,
    questionsCreated: 0,
    questionsUpdated: 0,
  };

  const courseData = manifest.course;
  const existingCourse = await db.learningCourse.findUnique({
    where: { contentKey: courseData.contentKey },
  });

  let courseId: string;
  if (existingCourse) {
    courseId = existingCourse.id;
    stats.courseUpdated = true;
    await db.learningCourse.update({
      where: { id: courseId },
      data: {
        title: courseData.title.trim(),
        subtitle: courseData.subtitle?.trim() || null,
        description: courseData.description?.trim() || null,
        category: courseData.category?.trim() || null,
        coverImageKey: courseData.coverImageKey ?? undefined,
        coverImageUrl: courseData.coverImageUrl ?? undefined,
        manifestVersion: manifest.manifestVersion,
        isOfficial: true,
        // Preserva status e matrículas — reimport não despublica nem altera lifecycle manual
      },
    });
  } else {
    stats.courseCreated = true;
    const created = await db.learningCourse.create({
      data: {
        contentKey: courseData.contentKey,
        manifestVersion: manifest.manifestVersion,
        isOfficial: true,
        title: courseData.title.trim(),
        subtitle: courseData.subtitle?.trim() || null,
        description: courseData.description?.trim() || null,
        category: courseData.category?.trim() || null,
        coverImageKey: courseData.coverImageKey ?? null,
        coverImageUrl: courseData.coverImageUrl ?? null,
        tenantId: courseData.tenantId ?? null,
        status: courseData.status ?? 'draft',
      },
    });
    courseId = created.id;
  }

  for (const modManifest of manifest.modules) {
    const existingModule = await db.learningCourseModule.findUnique({
      where: {
        courseId_contentKey: {
          courseId,
          contentKey: modManifest.contentKey,
        },
      },
    });

    let moduleId: string;
    if (existingModule) {
      moduleId = existingModule.id;
      stats.modulesUpdated += 1;
      await db.learningCourseModule.update({
        where: { id: moduleId },
        data: {
          title: modManifest.title.trim(),
          sortOrder: modManifest.sortOrder,
        },
      });
    } else {
      stats.modulesCreated += 1;
      const createdMod = await db.learningCourseModule.create({
        data: {
          courseId,
          contentKey: modManifest.contentKey,
          title: modManifest.title.trim(),
          sortOrder: modManifest.sortOrder,
        },
      });
      moduleId = createdMod.id;
    }

    for (const lessonManifest of modManifest.lessons ?? []) {
      await upsertOfficialLesson(
        db,
        {
          moduleId,
          courseMethodology: courseData.methodology,
          lesson: lessonManifest,
        },
        stats,
      );
    }
  }

  return {
    manifestId: manifest.manifestId,
    courseId,
    courseContentKey: courseData.contentKey,
    stats,
  };
}

async function upsertOfficialLesson(
  db: Db,
  ctx: {
    moduleId: string;
    courseMethodology?: 'LIVE';
    lesson: LearningContentLessonManifest;
  },
  stats: LearningContentImportStats,
) {
  const { lesson, moduleId, courseMethodology } = ctx;
  const mediaFields = mediaToLessonFields(lesson);
  const liveMeta = buildLiveMeta(lesson.live, courseMethodology);

  const existingLesson = await db.learningLesson.findUnique({
    where: {
      moduleId_contentKey: {
        moduleId,
        contentKey: lesson.contentKey,
      },
    },
    include: { quiz: true },
  });

  let lessonId: string;
  if (existingLesson) {
    lessonId = existingLesson.id;
    stats.lessonsUpdated += 1;
    await db.learningLesson.update({
      where: { id: lessonId },
      data: {
        title: lesson.title.trim(),
        sortOrder: lesson.sortOrder,
        lessonType: lesson.lessonType,
        contentHtml: lesson.contentHtml ?? null,
        estimatedMinutes: lesson.estimatedMinutes ?? null,
        liveMeta: liveMeta ?? undefined,
        ...mediaFields,
      },
    });
  } else {
    stats.lessonsCreated += 1;
    const created = await db.learningLesson.create({
      data: {
        moduleId,
        contentKey: lesson.contentKey,
        title: lesson.title.trim(),
        sortOrder: lesson.sortOrder,
        lessonType: lesson.lessonType,
        contentHtml: lesson.contentHtml ?? null,
        estimatedMinutes: lesson.estimatedMinutes ?? null,
        liveMeta: liveMeta ?? undefined,
        ...mediaFields,
      },
    });
    lessonId = created.id;
  }

  if (lesson.lessonType === 'QUIZ' && lesson.quiz) {
    await upsertOfficialQuiz(db, lessonId, lesson.quiz, stats);
  }
}

async function upsertOfficialQuiz(
  db: Db,
  lessonId: string,
  quizManifest: NonNullable<LearningContentLessonManifest['quiz']>,
  stats: LearningContentImportStats,
) {
  const existingQuiz = await db.learningQuiz.findUnique({
    where: { lessonId },
  });

  let quizId: string;
  if (existingQuiz) {
    quizId = existingQuiz.id;
    await db.learningQuiz.update({
      where: { id: quizId },
      data: {
        passingScore: quizManifest.passingScore ?? existingQuiz.passingScore,
        maxAttempts: quizManifest.maxAttempts ?? existingQuiz.maxAttempts,
      },
    });
  } else {
    const created = await db.learningQuiz.create({
      data: {
        lessonId,
        passingScore: quizManifest.passingScore ?? 70,
        maxAttempts: quizManifest.maxAttempts ?? 3,
      },
    });
    quizId = created.id;
  }
  stats.quizzesUpserted += 1;

  for (const q of quizManifest.questions ?? []) {
    const existingQ = await db.learningQuizQuestion.findUnique({
      where: {
        quizId_contentKey: {
          quizId,
          contentKey: q.contentKey,
        },
      },
    });

    const payload = {
      options: q.options,
      correctIndex: q.correctIndex,
    };

    if (existingQ) {
      stats.questionsUpdated += 1;
      await db.learningQuizQuestion.update({
        where: { id: existingQ.id },
        data: {
          sortOrder: q.sortOrder,
          question: q.question.trim(),
          payload,
        },
      });
    } else {
      stats.questionsCreated += 1;
      await db.learningQuizQuestion.create({
        data: {
          quizId,
          contentKey: q.contentKey,
          sortOrder: q.sortOrder,
          question: q.question.trim(),
          payload,
        },
      });
    }
  }
}
