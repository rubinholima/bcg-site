import { importLearningContentManifest } from './learning-content.importer';
import type { LearningContentManifest } from './learning-content.types';

type Row = Record<string, unknown> & { id: string };

function createMockDb(initial?: {
  courses?: Row[];
  modules?: Row[];
  lessons?: Row[];
  lessonProgress?: Row[];
  enrollments?: Row[];
  quizzes?: Row[];
  questions?: Row[];
}) {
  const courses = new Map<string, Row>();
  const modules = new Map<string, Row>();
  const lessons = new Map<string, Row>();
  const lessonProgress = [...(initial?.lessonProgress ?? [])];
  const enrollments = [...(initial?.enrollments ?? [])];
  const quizzes = new Map<string, Row>();
  const questions = new Map<string, Row>();

  for (const c of initial?.courses ?? []) {
    if (c.contentKey) courses.set(String(c.contentKey), { ...c });
  }
  for (const m of initial?.modules ?? []) {
    modules.set(`${m.courseId}:${m.contentKey}`, { ...m });
  }
  for (const l of initial?.lessons ?? []) {
    lessons.set(`${l.moduleId}:${l.contentKey}`, { ...l });
  }
  for (const q of initial?.quizzes ?? []) {
    quizzes.set(String(q.lessonId), { ...q });
  }
  for (const q of initial?.questions ?? []) {
    questions.set(`${q.quizId}:${q.contentKey}`, { ...q });
  }

  let seq = 1;
  const nextId = () => `id-${seq++}`;

  return {
    lessonProgress,
    enrollments,
    learningCourse: {
      findUnique: jest.fn(async ({ where }: { where: { contentKey: string } }) =>
        courses.get(where.contentKey) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: nextId(), ...data };
        if (data.contentKey) courses.set(String(data.contentKey), row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...courses.values()].find((c) => c.id === where.id);
        if (!row) throw new Error('course not found');
        Object.assign(row, data);
        return row;
      }),
    },
    learningCourseModule: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { courseId_contentKey: { courseId: string; contentKey: string } };
        }) => modules.get(`${where.courseId_contentKey.courseId}:${where.courseId_contentKey.contentKey}`) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: nextId(), ...data };
        modules.set(`${data.courseId}:${data.contentKey}`, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...modules.values()].find((m) => m.id === where.id);
        if (!row) throw new Error('module not found');
        Object.assign(row, data);
        return row;
      }),
    },
    learningLesson: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { moduleId_contentKey: { moduleId: string; contentKey: string } };
        }) => lessons.get(`${where.moduleId_contentKey.moduleId}:${where.moduleId_contentKey.contentKey}`) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: nextId(), ...data };
        lessons.set(`${data.moduleId}:${data.contentKey}`, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...lessons.values()].find((l) => l.id === where.id);
        if (!row) throw new Error('lesson not found');
        Object.assign(row, data);
        return row;
      }),
      deleteMany: jest.fn(),
    },
    learningQuiz: {
      findUnique: jest.fn(async ({ where }: { where: { lessonId: string } }) => quizzes.get(where.lessonId) ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: nextId(), passingScore: 70, maxAttempts: 3, ...data };
        quizzes.set(String(data.lessonId), row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...quizzes.values()].find((q) => q.id === where.id);
        if (!row) throw new Error('quiz not found');
        Object.assign(row, data);
        return row;
      }),
    },
    learningQuizQuestion: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { quizId_contentKey: { quizId: string; contentKey: string } };
        }) => questions.get(`${where.quizId_contentKey.quizId}:${where.quizId_contentKey.contentKey}`) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: nextId(), ...data };
        questions.set(`${data.quizId}:${data.contentKey}`, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...questions.values()].find((q) => q.id === where.id);
        if (!row) throw new Error('question not found');
        Object.assign(row, data);
        return row;
      }),
      deleteMany: jest.fn(),
    },
    counts: () => ({
      courses: courses.size,
      modules: modules.size,
      lessons: lessons.size,
      questions: questions.size,
    }),
  };
}

const shellManifest: LearningContentManifest = {
  manifestId: 'cup360-english-start-v1',
  manifestVersion: '1.0.0',
  course: {
    contentKey: 'cup360-english-start-v1',
    title: 'CUP360 English',
    subtitle: 'English for Life, Work & Football',
    status: 'draft',
    methodology: 'LIVE',
  },
  modules: [
    { contentKey: 'start-module-01-hello', title: 'Hello!', sortOrder: 0, lessons: [] },
    { contentKey: 'start-module-02-getting-to-know-you', title: 'Getting to Know You', sortOrder: 1, lessons: [] },
  ],
};

const manifestWithLesson: LearningContentManifest = {
  ...shellManifest,
  modules: [
    {
      contentKey: 'start-module-01-hello',
      title: 'Hello! — Seu primeiro contato',
      sortOrder: 0,
      lessons: [
        {
          contentKey: 'start-lesson-01-learn-greetings',
          title: 'Greetings',
          sortOrder: 0,
          lessonType: 'TEXT',
          estimatedMinutes: 10,
          contentHtml: '<p>Hello</p>',
          live: {
            learn: 'Learn greetings',
            imitate: 'Repeat aloud',
            verify: 'Self-check',
            executeMission: 'Say hello to a colleague',
          },
        },
        {
          contentKey: 'start-lesson-01-quiz-greetings',
          title: 'Quiz — Greetings',
          sortOrder: 1,
          lessonType: 'QUIZ',
          quiz: {
            passingScore: 80,
            questions: [
              {
                contentKey: 'start-q-01',
                sortOrder: 0,
                question: 'How do you say olá?',
                options: ['Hello', 'Goodbye'],
                correctIndex: 0,
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('importLearningContentManifest', () => {
  it('cria curso e módulos na primeira importação', async () => {
    const db = createMockDb();
    const result = await importLearningContentManifest(db as never, shellManifest);

    expect(result.courseContentKey).toBe('cup360-english-start-v1');
    expect(result.stats.courseCreated).toBe(true);
    expect(result.stats.modulesCreated).toBe(2);
    expect(db.counts().courses).toBe(1);
    expect(db.counts().modules).toBe(2);
    expect(db.learningCourse.create).toHaveBeenCalledTimes(1);
  });

  it('é idempotente — segunda importação não duplica', async () => {
    const db = createMockDb();
    await importLearningContentManifest(db as never, shellManifest);
    const second = await importLearningContentManifest(db as never, shellManifest);

    expect(second.stats.courseCreated).toBe(false);
    expect(second.stats.courseUpdated).toBe(true);
    expect(second.stats.modulesCreated).toBe(0);
    expect(second.stats.modulesUpdated).toBe(2);
    expect(db.counts().courses).toBe(1);
    expect(db.counts().modules).toBe(2);
    expect(db.learningCourse.create).toHaveBeenCalledTimes(1);
    expect(db.learningCourseModule.create).toHaveBeenCalledTimes(2);
  });

  it('atualiza lições/quiz por contentKey sem recriar', async () => {
    const db = createMockDb();
    const first = await importLearningContentManifest(db as never, manifestWithLesson);
    const second = await importLearningContentManifest(db as never, {
      ...manifestWithLesson,
      manifestVersion: '1.0.1',
      modules: [
        {
          ...manifestWithLesson.modules[0],
          lessons: [
            {
              ...manifestWithLesson.modules[0].lessons![0],
              contentHtml: '<p>Hello updated</p>',
            },
            manifestWithLesson.modules[0].lessons![1],
          ],
        },
      ],
    });

    expect(first.stats.lessonsCreated).toBe(2);
    expect(first.stats.questionsCreated).toBe(1);
    expect(second.stats.lessonsCreated).toBe(0);
    expect(second.stats.lessonsUpdated).toBe(2);
    expect(second.stats.questionsCreated).toBe(0);
    expect(second.stats.questionsUpdated).toBe(1);
    expect(db.counts().lessons).toBe(2);
    expect(db.counts().questions).toBe(1);
    expect(db.learningLesson.deleteMany).not.toHaveBeenCalled();
    expect(db.learningQuizQuestion.deleteMany).not.toHaveBeenCalled();
  });

  it('preserva progresso — reimport não apaga matrículas/progresso existentes', async () => {
    const db = createMockDb({
      courses: [
        {
          id: 'course-1',
          contentKey: 'cup360-english-start-v1',
          status: 'published',
          title: 'Old title',
        },
      ],
      modules: [
        {
          id: 'mod-1',
          courseId: 'course-1',
          contentKey: 'start-module-01-hello',
          title: 'Hello',
          sortOrder: 0,
        },
      ],
      lessons: [
        {
          id: 'lesson-1',
          moduleId: 'mod-1',
          contentKey: 'start-lesson-01-learn-greetings',
          title: 'Greetings',
          sortOrder: 0,
          lessonType: 'TEXT',
        },
      ],
      enrollments: [{ id: 'enr-1', courseId: 'course-1', userId: 'user-1' }],
      lessonProgress: [
        {
          id: 'prog-1',
          enrollmentId: 'enr-1',
          lessonId: 'lesson-1',
          status: 'completed',
          progressPct: 100,
        },
      ],
    });

    const result = await importLearningContentManifest(db as never, manifestWithLesson);

    expect(result.stats.courseUpdated).toBe(true);
    expect(result.stats.courseCreated).toBe(false);
    expect(db.enrollments).toHaveLength(1);
    expect(db.lessonProgress).toHaveLength(1);
    expect(db.lessonProgress[0].status).toBe('completed');
    expect(db.learningCourse.create).not.toHaveBeenCalled();
    expect(db.learningLesson.deleteMany).not.toHaveBeenCalled();
  });
});
