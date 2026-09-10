import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import { S3Service } from '../s3/s3.service';
import {
  LEARNING_ASSIGNMENT_MODES,
  LEARNING_COURSE_STATUSES,
  LEARNING_LESSON_TYPES,
  type LearningAssignmentMode,
  type LearningCourseStatus,
  type LearningLessonType,
} from './desenvolvimento.constants';
import {
  computeProgressPct,
  isCourseVisibleToTenant,
  resolveEnrollmentStatus,
  scoreQuizAttempt,
  type QuizAnswerInput,
} from './desenvolvimento.util';

type Actor = { sub: string; role?: string };

const courseInclude = {
  modules: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      lessons: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          quiz: {
            include: { questions: { orderBy: { sortOrder: 'asc' as const } } },
          },
        },
      },
    },
  },
  tenant: { select: { id: true, name: true, slug: true } },
};

@Injectable()
export class DesenvolvimentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly s3: S3Service,
  ) {}

  private async actorContext(actor: Actor) {
    const userId = await this.tenantAccess.resolveInternalUserId(actor.sub);
    if (!userId) throw new ForbiddenException('Usuário não encontrado.');
    const allowedTenantIds = await this.tenantAccess.getAllowedTenantIds(
      actor.sub,
      actor.role,
    );
    return {
      userId,
      allowedTenantIds,
      isSuperAdmin: actor.role === 'super_admin',
    };
  }

  private assertCourseAdminScope(
    course: { tenantId: string | null },
    allowedTenantIds: string[] | null,
    isSuperAdmin: boolean,
  ) {
    if (isSuperAdmin) return;
    if (!course.tenantId) {
      throw new ForbiddenException(
        'Somente super admin pode administrar cursos globais.',
      );
    }
    this.tenantAccess.assertCanAccessTenant(allowedTenantIds, course.tenantId);
  }

  private tenantFilter(
    allowedTenantIds: string[] | null,
    isSuperAdmin: boolean,
  ) {
    if (isSuperAdmin) return undefined;
    return {
      OR: [{ tenantId: { in: allowedTenantIds ?? [] } }, { tenantId: null }],
    };
  }

  async listAdminCourses(actor: Actor, tenantId?: string) {
    const ctx = await this.actorContext(actor);
    if (tenantId)
      this.tenantAccess.assertCanAccessTenant(ctx.allowedTenantIds, tenantId);
    const where = {
      ...(tenantId
        ? { tenantId }
        : this.tenantFilter(ctx.allowedTenantIds, ctx.isSuperAdmin)),
    };
    return this.prisma.learningCourse.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    });
  }

  async getAdminCourse(actor: Actor, courseId: string) {
    const ctx = await this.actorContext(actor);
    const course = await this.prisma.learningCourse.findUnique({
      where: { id: courseId },
      include: courseInclude,
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    this.assertCourseAdminScope(course, ctx.allowedTenantIds, ctx.isSuperAdmin);
    return course;
  }

  async createCourse(
    actor: Actor,
    data: {
      title: string;
      subtitle?: string;
      description?: string;
      category?: string;
      tenantId?: string | null;
    },
  ) {
    const ctx = await this.actorContext(actor);
    const tenantId = data.tenantId?.trim() || null;
    if (tenantId) {
      this.tenantAccess.assertCanAccessTenant(ctx.allowedTenantIds, tenantId);
    } else if (!ctx.isSuperAdmin) {
      throw new ForbiddenException('Cursos globais exigem super admin.');
    }
    return this.prisma.learningCourse.create({
      data: {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        description: data.description?.trim() || null,
        category: data.category?.trim() || null,
        tenantId,
        createdByUserId: ctx.userId,
        status: 'draft',
      },
    });
  }

  async updateCourse(
    actor: Actor,
    courseId: string,
    data: {
      title?: string;
      subtitle?: string | null;
      description?: string | null;
      category?: string | null;
      tenantId?: string | null;
    },
  ) {
    const course = await this.getAdminCourse(actor, courseId);
    const ctx = await this.actorContext(actor);
    if (data.tenantId !== undefined) {
      const tenantId = data.tenantId;
      if (tenantId)
        this.tenantAccess.assertCanAccessTenant(ctx.allowedTenantIds, tenantId);
      else if (!ctx.isSuperAdmin)
        throw new ForbiddenException('Cursos globais exigem super admin.');
    }
    return this.prisma.learningCourse.update({
      where: { id: course.id },
      data: {
        title: data.title?.trim() ?? undefined,
        subtitle: data.subtitle,
        description: data.description,
        category: data.category,
        tenantId: data.tenantId,
      },
    });
  }

  async setCourseStatus(
    actor: Actor,
    courseId: string,
    status: LearningCourseStatus,
  ) {
    if (!LEARNING_COURSE_STATUSES.includes(status)) {
      throw new BadRequestException('Status inválido.');
    }
    const course = await this.getAdminCourse(actor, courseId);
    return this.prisma.learningCourse.update({
      where: { id: course.id },
      data: {
        status,
        publishedAt: status === 'published' ? new Date() : course.publishedAt,
      },
    });
  }

  async upsertModule(
    actor: Actor,
    courseId: string,
    data: { id?: string; title: string; sortOrder: number },
  ) {
    await this.getAdminCourse(actor, courseId);
    if (data.id) {
      const mod = await this.prisma.learningCourseModule.findFirst({
        where: { id: data.id, courseId },
      });
      if (!mod) throw new NotFoundException('Módulo não encontrado.');
      return this.prisma.learningCourseModule.update({
        where: { id: data.id },
        data: { title: data.title.trim(), sortOrder: data.sortOrder },
      });
    }
    return this.prisma.learningCourseModule.create({
      data: { courseId, title: data.title.trim(), sortOrder: data.sortOrder },
    });
  }

  async deleteModule(actor: Actor, courseId: string, moduleId: string) {
    await this.getAdminCourse(actor, courseId);
    await this.prisma.learningCourseModule.deleteMany({
      where: { id: moduleId, courseId },
    });
    return { ok: true };
  }

  async upsertLesson(
    actor: Actor,
    courseId: string,
    moduleId: string,
    data: {
      id?: string;
      title: string;
      sortOrder: number;
      lessonType: LearningLessonType;
      contentHtml?: string | null;
      externalUrl?: string | null;
      estimatedMinutes?: number | null;
      quiz?: {
        passingScore?: number;
        maxAttempts?: number;
        questions?: {
          question: string;
          options: string[];
          correctIndex: number;
        }[];
      };
    },
  ) {
    await this.getAdminCourse(actor, courseId);
    const mod = await this.prisma.learningCourseModule.findFirst({
      where: { id: moduleId, courseId },
    });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');
    if (!LEARNING_LESSON_TYPES.includes(data.lessonType)) {
      throw new BadRequestException('Tipo de lição inválido.');
    }

    let lessonId = data.id;
    if (lessonId) {
      await this.prisma.learningLesson.update({
        where: { id: lessonId },
        data: {
          title: data.title.trim(),
          sortOrder: data.sortOrder,
          lessonType: data.lessonType,
          contentHtml: data.contentHtml ?? null,
          externalUrl: data.externalUrl ?? null,
          estimatedMinutes: data.estimatedMinutes ?? null,
        },
      });
    } else {
      const created = await this.prisma.learningLesson.create({
        data: {
          moduleId,
          title: data.title.trim(),
          sortOrder: data.sortOrder,
          lessonType: data.lessonType,
          contentHtml: data.contentHtml ?? null,
          externalUrl: data.externalUrl ?? null,
          estimatedMinutes: data.estimatedMinutes ?? null,
        },
      });
      lessonId = created.id;
    }

    if (data.lessonType === 'QUIZ' && data.quiz) {
      const quiz = await this.prisma.learningQuiz.upsert({
        where: { lessonId },
        create: {
          lessonId,
          passingScore: data.quiz.passingScore ?? 70,
          maxAttempts: data.quiz.maxAttempts ?? 3,
        },
        update: {
          passingScore: data.quiz.passingScore ?? 70,
          maxAttempts: data.quiz.maxAttempts ?? 3,
        },
      });
      if (data.quiz.questions) {
        await this.prisma.learningQuizQuestion.deleteMany({
          where: { quizId: quiz.id },
        });
        for (let i = 0; i < data.quiz.questions.length; i++) {
          const q = data.quiz.questions[i];
          await this.prisma.learningQuizQuestion.create({
            data: {
              quizId: quiz.id,
              sortOrder: i,
              question: q.question.trim(),
              payload: { options: q.options, correctIndex: q.correctIndex },
            },
          });
        }
      }
    }

    return this.prisma.learningLesson.findUnique({
      where: { id: lessonId },
      include: {
        quiz: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
  }

  async deleteLesson(
    actor: Actor,
    courseId: string,
    moduleId: string,
    lessonId: string,
  ) {
    await this.getAdminCourse(actor, courseId);
    await this.prisma.learningLesson.deleteMany({
      where: { id: lessonId, moduleId, module: { courseId } },
    });
    return { ok: true };
  }

  async uploadLessonFile(
    actor: Actor,
    courseId: string,
    lessonId: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
  ) {
    const course = await this.getAdminCourse(actor, courseId);
    const lesson = await this.prisma.learningLesson.findFirst({
      where: { id: lessonId, module: { courseId: course.id } },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    const isVideo = lesson.lessonType === 'VIDEO';
    let fileKey: string;
    let fileUrl: string;
    let mimeType: string | null;
    if (isVideo) {
      const uploaded = await this.s3.uploadVideo(
        file.buffer,
        file.mimetype || 'video/mp4',
        'lms',
      );
      fileKey = uploaded.key;
      fileUrl = uploaded.url;
      mimeType = file.mimetype ?? 'video/mp4';
    } else {
      const uploaded = await this.s3.uploadPsychologySupportMaterial(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      fileKey = uploaded.key;
      fileUrl = uploaded.url;
      mimeType = uploaded.mimeType ?? file.mimetype ?? null;
    }
    return this.prisma.learningLesson.update({
      where: { id: lessonId },
      data: { fileKey, fileUrl, mimeType },
    });
  }

  async listAssignments(actor: Actor, courseId: string) {
    await this.getAdminCourse(actor, courseId);
    return this.prisma.learningAssignment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true } },
        targetUser: { select: { id: true, username: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async createAssignment(
    actor: Actor,
    courseId: string,
    data: {
      targetMode: LearningAssignmentMode;
      tenantId?: string | null;
      targetRoleSlug?: string | null;
      targetUserId?: string | null;
      mandatory?: boolean;
      dueAt?: string | null;
    },
  ) {
    const course = await this.getAdminCourse(actor, courseId);
    const ctx = await this.actorContext(actor);
    if (!LEARNING_ASSIGNMENT_MODES.includes(data.targetMode)) {
      throw new BadRequestException('Modo de atribuição inválido.');
    }

    const tenantId = data.tenantId?.trim() || course.tenantId || null;
    if (
      ['all_tenant', 'tenant', 'role'].includes(data.targetMode) &&
      !tenantId
    ) {
      throw new BadRequestException(
        'tenantId é obrigatório para esta atribuição.',
      );
    }
    if (tenantId)
      this.tenantAccess.assertCanAccessTenant(ctx.allowedTenantIds, tenantId);
    if (data.targetMode === 'user' && !data.targetUserId) {
      throw new BadRequestException('targetUserId é obrigatório.');
    }
    if (data.targetMode === 'role' && !data.targetRoleSlug?.trim()) {
      throw new BadRequestException('targetRoleSlug é obrigatório.');
    }

    const assignment = await this.prisma.learningAssignment.create({
      data: {
        courseId: course.id,
        tenantId,
        targetMode: data.targetMode,
        targetRoleSlug: data.targetRoleSlug?.trim() || null,
        targetUserId: data.targetUserId || null,
        mandatory: data.mandatory ?? false,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        createdByUserId: ctx.userId,
      },
    });

    await this.materializeAssignment(assignment.id);
    return assignment;
  }

  async materializeAssignment(assignmentId: string) {
    const assignment = await this.prisma.learningAssignment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });
    if (!assignment || !assignment.active) return;

    const userIds = await this.resolveAssignmentUserIds(assignment);
    for (const userId of userIds) {
      await this.prisma.learningEnrollment.upsert({
        where: { courseId_userId: { courseId: assignment.courseId, userId } },
        create: {
          courseId: assignment.courseId,
          userId,
          assignmentId: assignment.id,
          status: 'assigned',
        },
        update: { assignmentId: assignment.id },
      });
    }
  }

  private async resolveAssignmentUserIds(assignment: {
    targetMode: string;
    tenantId: string | null;
    targetRoleSlug: string | null;
    targetUserId: string | null;
  }): Promise<string[]> {
    if (assignment.targetMode === 'user' && assignment.targetUserId) {
      return [assignment.targetUserId];
    }

    const tenantId = assignment.tenantId;
    if (!tenantId) return [];

    if (assignment.targetMode === 'role' && assignment.targetRoleSlug) {
      const links = await this.prisma.userTenant.findMany({
        where: { tenantId },
        select: {
          userId: true,
          user: { select: { role: true, blocked: true } },
        },
      });
      return links
        .filter(
          (l) => !l.user.blocked && l.user.role === assignment.targetRoleSlug,
        )
        .map((l) => l.userId);
    }

    if (['all_tenant', 'tenant'].includes(assignment.targetMode)) {
      const links = await this.prisma.userTenant.findMany({
        where: { tenantId },
        select: { userId: true, user: { select: { blocked: true } } },
      });
      return links.filter((l) => !l.user.blocked).map((l) => l.userId);
    }

    return [];
  }

  async listAdminProgress(actor: Actor, courseId: string) {
    await this.getAdminCourse(actor, courseId);
    return this.prisma.learningEnrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignment: { select: { mandatory: true, dueAt: true } },
      },
    });
  }

  async getStudentHub(actor: Actor) {
    const ctx = await this.actorContext(actor);
    const enrollments = await this.getStudentEnrollments(ctx.userId);
    const continueItem =
      enrollments.find(
        (e) =>
          e.status === 'in_progress' ||
          e.status === 'assigned' ||
          e.status === 'overdue',
      ) ??
      enrollments[0] ??
      null;
    return {
      continueLearning: continueItem,
      totals: {
        enrolled: enrollments.length,
        inProgress: enrollments.filter(
          (e) => e.status === 'in_progress' || e.status === 'assigned',
        ).length,
        completed: enrollments.filter((e) => e.status === 'completed').length,
        overdue: enrollments.filter((e) => e.status === 'overdue').length,
      },
    };
  }

  private async getStudentEnrollments(userId: string) {
    const rows = await this.prisma.learningEnrollment.findMany({
      where: { userId, course: { status: 'published' } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            category: true,
            tenantId: true,
            tenant: { select: { name: true } },
          },
        },
        assignment: { select: { mandatory: true, dueAt: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
    return rows.map((e) => ({
      ...e,
      mandatory: e.assignment?.mandatory ?? false,
      dueAt: e.assignment?.dueAt ?? null,
    }));
  }

  async listMyCourses(actor: Actor) {
    const ctx = await this.actorContext(actor);
    return this.getStudentEnrollments(ctx.userId);
  }

  async listCatalog(actor: Actor) {
    const ctx = await this.actorContext(actor);
    const tenantIds = ctx.allowedTenantIds;
    const courses = await this.prisma.learningCourse.findMany({
      where: {
        status: 'published',
        OR: [
          { tenantId: null, enrollments: { some: { userId: ctx.userId } } },
          ...(tenantIds === null
            ? [{ tenantId: { not: null } }]
            : [{ tenantId: { in: tenantIds } }]),
        ],
      },
      include: {
        tenant: { select: { id: true, name: true } },
        enrollments: {
          where: { userId: ctx.userId },
          select: { id: true, status: true, progressPct: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    return courses
      .filter((c) => {
        if (c.tenantId) return isCourseVisibleToTenant(c.tenantId, tenantIds);
        return c.enrollments.length > 0;
      })
      .map((c) => ({
        ...c,
        enrolled: c.enrollments[0] ?? null,
      }));
  }

  async getPlayer(actor: Actor, courseId: string) {
    const ctx = await this.actorContext(actor);
    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { courseId_userId: { courseId, userId: ctx.userId } },
      include: {
        course: { include: courseInclude },
        lessonProgress: true,
        assignment: { select: { mandatory: true, dueAt: true } },
      },
    });
    if (!enrollment)
      throw new ForbiddenException('Você não está matriculado neste curso.');
    if (enrollment.course.status !== 'published') {
      throw new ForbiddenException('Curso não publicado.');
    }
    if (
      enrollment.course.tenantId &&
      !isCourseVisibleToTenant(
        enrollment.course.tenantId,
        ctx.allowedTenantIds,
      ) &&
      !ctx.isSuperAdmin
    ) {
      throw new ForbiddenException('Curso fora do seu escopo de empresa.');
    }

    const progressMap = new Map(
      enrollment.lessonProgress.map((p) => [p.lessonId, p]),
    );
    const flatLessons = enrollment.course.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })),
    );

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        progressPct: enrollment.progressPct,
        mandatory: enrollment.assignment?.mandatory ?? false,
        dueAt: enrollment.assignment?.dueAt ?? null,
      },
      course: enrollment.course,
      lessons: flatLessons.map((l) => ({
        id: l.id,
        contentKey: l.contentKey,
        moduleId: l.moduleId,
        moduleTitle: l.moduleTitle,
        title: l.title,
        sortOrder: l.sortOrder,
        lessonType: l.lessonType,
        contentHtml: l.contentHtml,
        liveMeta: l.liveMeta,
        estimatedMinutes: l.estimatedMinutes,
        fileUrl: l.fileUrl,
        externalUrl: l.externalUrl,
        mimeType: l.mimeType,
        progress: progressMap.get(l.id) ?? null,
        quiz: l.quiz
          ? {
              ...l.quiz,
              questions: l.quiz.questions.map((q) => ({
                id: q.id,
                sortOrder: q.sortOrder,
                question: q.question,
                options: (q.payload as { options?: string[] }).options ?? [],
              })),
            }
          : null,
      })),
    };
  }

  async touchLesson(actor: Actor, enrollmentId: string, lessonId: string) {
    const ctx = await this.actorContext(actor);
    const enrollment = await this.prisma.learningEnrollment.findFirst({
      where: { id: enrollmentId, userId: ctx.userId },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada.');

    return this.prisma.learningLessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: {
        enrollmentId,
        lessonId,
        status: 'in_progress',
        lastSeenAt: new Date(),
        progressPct: 0,
      },
      update: { status: 'in_progress', lastSeenAt: new Date() },
    });
  }

  async completeLesson(actor: Actor, enrollmentId: string, lessonId: string) {
    const ctx = await this.actorContext(actor);
    const enrollment = await this.prisma.learningEnrollment.findFirst({
      where: { id: enrollmentId, userId: ctx.userId },
      include: {
        course: { include: { modules: { include: { lessons: true } } } },
        assignment: true,
      },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada.');

    const lesson = await this.prisma.learningLesson.findFirst({
      where: { id: lessonId, module: { courseId: enrollment.courseId } },
      include: { quiz: true },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    if (lesson.lessonType === 'QUIZ' || lesson.quiz) {
      throw new BadRequestException(
        'Conclua o quiz para finalizar esta lição.',
      );
    }

    await this.prisma.learningLessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: {
        enrollmentId,
        lessonId,
        status: 'completed',
        progressPct: 100,
        completedAt: new Date(),
        lastSeenAt: new Date(),
      },
      update: {
        status: 'completed',
        progressPct: 100,
        completedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    return this.refreshEnrollmentProgress(enrollment.id);
  }

  async submitQuiz(
    actor: Actor,
    enrollmentId: string,
    lessonId: string,
    answers: QuizAnswerInput[],
  ) {
    const ctx = await this.actorContext(actor);
    const enrollment = await this.prisma.learningEnrollment.findFirst({
      where: { id: enrollmentId, userId: ctx.userId },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada.');

    const lesson = await this.prisma.learningLesson.findFirst({
      where: {
        id: lessonId,
        module: { courseId: enrollment.courseId },
      },
      include: { quiz: { include: { questions: true } } },
    });
    if (!lesson?.quiz) throw new NotFoundException('Quiz não encontrado.');

    const attempts = await this.prisma.learningQuizAttempt.count({
      where: { enrollmentId, quizId: lesson.quiz.id },
    });
    if (attempts >= lesson.quiz.maxAttempts) {
      throw new BadRequestException('Número máximo de tentativas atingido.');
    }

    const scored = scoreQuizAttempt(lesson.quiz.questions, answers);
    const passed = scored.score >= lesson.quiz.passingScore;

    await this.prisma.learningQuizAttempt.create({
      data: {
        quizId: lesson.quiz.id,
        enrollmentId,
        userId: ctx.userId,
        score: scored.score,
        passed,
        answers: scored.answers,
      },
    });

    if (passed) {
      await this.prisma.learningLessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
        create: {
          enrollmentId,
          lessonId,
          status: 'completed',
          progressPct: 100,
          completedAt: new Date(),
          lastSeenAt: new Date(),
        },
        update: {
          status: 'completed',
          progressPct: 100,
          completedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
      await this.refreshEnrollmentProgress(enrollmentId);
    }

    return {
      score: scored.score,
      passed,
      passingScore: lesson.quiz.passingScore,
      attempts: attempts + 1,
    };
  }

  private async refreshEnrollmentProgress(enrollmentId: string) {
    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { include: { modules: { include: { lessons: true } } } },
        lessonProgress: true,
        assignment: true,
      },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada.');

    const totalLessons = enrollment.course.modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0,
    );
    const completed = enrollment.lessonProgress.filter(
      (p) => p.status === 'completed',
    ).length;
    const progressPct = computeProgressPct(completed, totalLessons);
    const status = resolveEnrollmentStatus(
      progressPct,
      enrollment.assignment?.mandatory ?? false,
      enrollment.assignment?.dueAt,
    );

    return this.prisma.learningEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPct,
        status,
        completedAt: progressPct >= 100 ? new Date() : null,
      },
    });
  }
}
