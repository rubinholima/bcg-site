-- Desenvolvimento LMS V1

CREATE TABLE "LearningCourse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "coverImageKey" TEXT,
    "coverImageUrl" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningCourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCourseModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lessonType" TEXT NOT NULL,
    "contentHtml" TEXT,
    "fileKey" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "mimeType" TEXT,
    "estimatedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tenantId" TEXT,
    "targetMode" TEXT NOT NULL,
    "targetRoleSlug" TEXT,
    "targetUserId" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "progressPct" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LearningEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningLessonProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LearningLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningQuiz" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "LearningQuiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningQuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "LearningQuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningQuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningQuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningEnrollment_courseId_userId_key" ON "LearningEnrollment"("courseId", "userId");
CREATE UNIQUE INDEX "LearningLessonProgress_enrollmentId_lessonId_key" ON "LearningLessonProgress"("enrollmentId", "lessonId");
CREATE UNIQUE INDEX "LearningQuiz_lessonId_key" ON "LearningQuiz"("lessonId");

CREATE INDEX "LearningCourse_tenantId_status_idx" ON "LearningCourse"("tenantId", "status");
CREATE INDEX "LearningCourse_status_idx" ON "LearningCourse"("status");
CREATE INDEX "LearningCourseModule_courseId_sortOrder_idx" ON "LearningCourseModule"("courseId", "sortOrder");
CREATE INDEX "LearningLesson_moduleId_sortOrder_idx" ON "LearningLesson"("moduleId", "sortOrder");
CREATE INDEX "LearningAssignment_courseId_active_idx" ON "LearningAssignment"("courseId", "active");
CREATE INDEX "LearningAssignment_tenantId_idx" ON "LearningAssignment"("tenantId");
CREATE INDEX "LearningEnrollment_userId_status_idx" ON "LearningEnrollment"("userId", "status");
CREATE INDEX "LearningLessonProgress_enrollmentId_idx" ON "LearningLessonProgress"("enrollmentId");
CREATE INDEX "LearningQuizQuestion_quizId_sortOrder_idx" ON "LearningQuizQuestion"("quizId", "sortOrder");
CREATE INDEX "LearningQuizAttempt_enrollmentId_quizId_idx" ON "LearningQuizAttempt"("enrollmentId", "quizId");
CREATE INDEX "LearningQuizAttempt_userId_idx" ON "LearningQuizAttempt"("userId");

ALTER TABLE "LearningCourse" ADD CONSTRAINT "LearningCourse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningCourse" ADD CONSTRAINT "LearningCourse_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningCourseModule" ADD CONSTRAINT "LearningCourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningCourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LearningAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningLessonProgress" ADD CONSTRAINT "LearningLessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningLessonProgress" ADD CONSTRAINT "LearningLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningQuiz" ADD CONSTRAINT "LearningQuiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningQuizQuestion" ADD CONSTRAINT "LearningQuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LearningQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningQuizAttempt" ADD CONSTRAINT "LearningQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LearningQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningQuizAttempt" ADD CONSTRAINT "LearningQuizAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningQuizAttempt" ADD CONSTRAINT "LearningQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Módulos RBAC
INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-desenvolvimento', 'desenvolvimento', 'Desenvolvimento', 950, 'outros'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'desenvolvimento');

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-desenvolvimento-admin', 'desenvolvimento__desenvolvimento_admin', 'Desenvolvimento — Administração', 951, 'outros'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'desenvolvimento__desenvolvimento_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dev-sa', 'mod-desenvolvimento', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-desenvolvimento' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dev-ca', 'mod-desenvolvimento', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-desenvolvimento' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dev-adm-sa', 'mod-desenvolvimento-admin', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-desenvolvimento-admin' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dev-adm-ca', 'mod-desenvolvimento-admin', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-desenvolvimento-admin' AND "role" = 'company_admin');
