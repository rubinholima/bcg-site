export const LEARNING_COURSE_STATUSES = [
  'draft',
  'published',
  'archived',
] as const;
export type LearningCourseStatus = (typeof LEARNING_COURSE_STATUSES)[number];

export const LEARNING_LESSON_TYPES = [
  'VIDEO',
  'TEXT',
  'DOCUMENT',
  'LINK',
  'QUIZ',
] as const;
export type LearningLessonType = (typeof LEARNING_LESSON_TYPES)[number];

export const LEARNING_ASSIGNMENT_MODES = [
  'all_tenant',
  'tenant',
  'role',
  'user',
] as const;
export type LearningAssignmentMode = (typeof LEARNING_ASSIGNMENT_MODES)[number];

export const LEARNING_ENROLLMENT_STATUSES = [
  'assigned',
  'in_progress',
  'completed',
  'overdue',
] as const;

export const LEARNING_LESSON_PROGRESS_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
