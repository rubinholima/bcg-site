import type { LearningLiveMeta } from "./learning-player-types";

export type LearningCourseStatus = "draft" | "published" | "archived";
export type LearningLessonType = "VIDEO" | "TEXT" | "DOCUMENT" | "LINK" | "QUIZ";
export type LearningAssignmentMode = "all_tenant" | "tenant" | "role" | "user";

export interface LearningCourseSummary {
  id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  status: LearningCourseStatus;
  tenantId: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
  _count?: { enrollments: number; modules: number };
}

export interface LearningEnrollmentRow {
  id: string;
  status: string;
  progressPct: number;
  enrolledAt: string;
  completedAt: string | null;
  mandatory?: boolean;
  dueAt?: string | null;
  course: {
    id: string;
    title: string;
    subtitle: string | null;
    category: string | null;
    tenant?: { name: string } | null;
  };
}

export interface LearningHubResponse {
  continueLearning: LearningEnrollmentRow | null;
  totals: {
    enrolled: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export interface LearningPlayerLesson {
  id: string;
  contentKey?: string | null;
  moduleId: string;
  moduleTitle: string;
  title: string;
  sortOrder: number;
  lessonType: LearningLessonType;
  contentHtml: string | null;
  liveMeta?: LearningLiveMeta | null;
  estimatedMinutes?: number | null;
  fileUrl: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  progress: { status: string; completedAt: string | null } | null;
  quiz: {
    id: string;
    passingScore: number;
    maxAttempts: number;
    questions: { id: string; question: string; options: string[] }[];
  } | null;
}

export interface LearningPlayerResponse {
  enrollment: {
    id: string;
    status: string;
    progressPct: number;
    mandatory: boolean;
    dueAt: string | null;
  };
  course: {
    id: string;
    title: string;
    subtitle: string | null;
    modules: { id: string; title: string; sortOrder: number; lessons: { id: string; title: string }[] }[];
  };
  lessons: LearningPlayerLesson[];
}
