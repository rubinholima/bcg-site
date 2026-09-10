import { BadRequestException } from '@nestjs/common';
import {
  LEARNING_COURSE_STATUSES,
  LEARNING_LESSON_TYPES,
} from '../desenvolvimento.constants';
import type {
  LearningContentLessonManifest,
  LearningContentManifest,
  LearningContentModuleManifest,
} from './learning-content.types';

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${label} é obrigatório.`);
  }
}

function validateLesson(lesson: LearningContentLessonManifest, path: string) {
  assertNonEmpty(lesson.contentKey, `${path}.contentKey`);
  assertNonEmpty(lesson.title, `${path}.title`);
  if (!LEARNING_LESSON_TYPES.includes(lesson.lessonType)) {
    throw new BadRequestException(`${path}.lessonType inválido.`);
  }
  if (typeof lesson.sortOrder !== 'number' || lesson.sortOrder < 0) {
    throw new BadRequestException(`${path}.sortOrder inválido.`);
  }
  if (lesson.quiz?.questions) {
    const qKeys = new Set<string>();
    for (const [i, q] of lesson.quiz.questions.entries()) {
      assertNonEmpty(q.contentKey, `${path}.quiz.questions[${i}].contentKey`);
      if (qKeys.has(q.contentKey)) {
        throw new BadRequestException(
          `${path}.quiz: contentKey duplicado (${q.contentKey}).`,
        );
      }
      qKeys.add(q.contentKey);
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new BadRequestException(
          `${path}.quiz.questions[${i}].options inválido.`,
        );
      }
      if (
        typeof q.correctIndex !== 'number' ||
        q.correctIndex < 0 ||
        q.correctIndex >= q.options.length
      ) {
        throw new BadRequestException(
          `${path}.quiz.questions[${i}].correctIndex inválido.`,
        );
      }
    }
  }
}

function validateModule(mod: LearningContentModuleManifest, path: string) {
  assertNonEmpty(mod.contentKey, `${path}.contentKey`);
  assertNonEmpty(mod.title, `${path}.title`);
  if (typeof mod.sortOrder !== 'number' || mod.sortOrder < 0) {
    throw new BadRequestException(`${path}.sortOrder inválido.`);
  }
  for (const [i, lesson] of (mod.lessons ?? []).entries()) {
    validateLesson(lesson, `${path}.lessons[${i}]`);
  }
}

export function validateLearningContentManifest(
  manifest: LearningContentManifest,
): LearningContentManifest {
  assertNonEmpty(manifest.manifestId, 'manifestId');
  assertNonEmpty(manifest.manifestVersion, 'manifestVersion');
  assertNonEmpty(manifest.course?.contentKey, 'course.contentKey');
  assertNonEmpty(manifest.course?.title, 'course.title');

  if (
    manifest.course.status &&
    !LEARNING_COURSE_STATUSES.includes(manifest.course.status)
  ) {
    throw new BadRequestException('course.status inválido.');
  }

  if (manifest.manifestId !== manifest.course.contentKey) {
    throw new BadRequestException(
      'manifestId deve ser igual a course.contentKey.',
    );
  }

  if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
    throw new BadRequestException('modules deve conter ao menos um módulo.');
  }

  const moduleKeys = new Set<string>();
  for (const [i, mod] of manifest.modules.entries()) {
    validateModule(mod, `modules[${i}]`);
    if (moduleKeys.has(mod.contentKey)) {
      throw new BadRequestException(
        `modules: contentKey duplicado (${mod.contentKey}).`,
      );
    }
    moduleKeys.add(mod.contentKey);
  }

  return manifest;
}
