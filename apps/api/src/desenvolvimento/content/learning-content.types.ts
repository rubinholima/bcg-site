import type {
  LearningCourseStatus,
  LearningLessonType,
} from '../desenvolvimento.constants';

/** Shell curricular START v2 — metadados antes do Player v2 completo */
export type LearningCurriculumShell = {
  objectivePt: string;
  outcomePt: string;
  coreConcepts: string[];
  prerequisites: string[];
  lessonKind: 'lesson' | 'challenge';
  playerVersionTarget: 2;
};

/** Metodologia LIVE — campos pedagógicos por lição oficial */
export type LearningLiveMeta = {
  methodology?: 'LIVE';
  realLifeContext?: string;
  learn?: string;
  imitate?: string;
  buildPractice?: string;
  verify?: string;
  executeMission?: string;
  /** Shell curricular (lições ainda sem Player v2 populado) */
  curriculum?: LearningCurriculumShell;
  /** Experiência premium do player (versionado, backward-compatible) */
  player?: Record<string, unknown>;
};

export type LearningContentMediaRef = {
  url?: string;
  key?: string;
  mimeType?: string;
};

export type LearningContentQuizQuestionManifest = {
  contentKey: string;
  sortOrder: number;
  question: string;
  options: string[];
  correctIndex: number;
};

export type LearningContentQuizManifest = {
  passingScore?: number;
  maxAttempts?: number;
  questions?: LearningContentQuizQuestionManifest[];
};

export type LearningContentLessonManifest = {
  contentKey: string;
  title: string;
  sortOrder: number;
  lessonType: LearningLessonType;
  estimatedMinutes?: number;
  contentHtml?: string;
  video?: LearningContentMediaRef;
  audio?: LearningContentMediaRef;
  document?: LearningContentMediaRef;
  externalUrl?: string;
  live?: LearningLiveMeta;
  quiz?: LearningContentQuizManifest;
};

export type LearningContentModuleManifest = {
  contentKey: string;
  title: string;
  sortOrder: number;
  lessons?: LearningContentLessonManifest[];
};

export type LearningContentCourseManifest = {
  contentKey: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  status?: LearningCourseStatus;
  tenantId?: string | null;
  methodology?: 'LIVE';
  coverImageUrl?: string;
  coverImageKey?: string;
};

export type LearningContentManifest = {
  manifestId: string;
  manifestVersion: string;
  course: LearningContentCourseManifest;
  modules: LearningContentModuleManifest[];
};

export type LearningContentImportStats = {
  courseCreated: boolean;
  courseUpdated: boolean;
  modulesCreated: number;
  modulesUpdated: number;
  lessonsCreated: number;
  lessonsUpdated: number;
  quizzesUpserted: number;
  questionsCreated: number;
  questionsUpdated: number;
};

export type LearningContentImportResult = {
  manifestId: string;
  courseId: string;
  courseContentKey: string;
  stats: LearningContentImportStats;
};
