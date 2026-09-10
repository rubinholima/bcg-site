import type { LearningQuizQuestion } from '@prisma/client';

export type QuizAnswerInput = { questionId: string; selectedIndex: number };

export function scoreQuizAttempt(
  questions: Pick<LearningQuizQuestion, 'id' | 'payload'>[],
  answers: QuizAnswerInput[],
): { score: number; passed: boolean; answers: QuizAnswerInput[] } {
  if (!questions.length) {
    return { score: 0, passed: false, answers };
  }
  const answerMap = new Map(
    answers.map((a) => [a.questionId, a.selectedIndex]),
  );
  let correct = 0;
  for (const q of questions) {
    const payload = q.payload as { correctIndex?: number };
    const selected = answerMap.get(q.id);
    if (selected === payload.correctIndex) correct += 1;
  }
  const score = Math.round((correct / questions.length) * 100);
  return { score, passed: score >= 70, answers };
}

export function computeProgressPct(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export function isCourseVisibleToTenant(
  courseTenantId: string | null | undefined,
  allowedTenantIds: string[] | null,
): boolean {
  if (allowedTenantIds === null) return true;
  if (!courseTenantId) return false;
  return allowedTenantIds.includes(courseTenantId);
}

export function resolveEnrollmentStatus(
  progressPct: number,
  mandatory: boolean,
  dueAt: Date | null | undefined,
  now = new Date(),
): 'assigned' | 'in_progress' | 'completed' | 'overdue' {
  if (progressPct >= 100) return 'completed';
  if (mandatory && dueAt && dueAt.getTime() < now.getTime()) return 'overdue';
  if (progressPct > 0) return 'in_progress';
  return 'assigned';
}
