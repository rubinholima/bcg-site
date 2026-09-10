-- Chaves estáveis para importação idempotente de conteúdo oficial CUP360

ALTER TABLE "LearningCourse" ADD COLUMN "contentKey" TEXT;
ALTER TABLE "LearningCourse" ADD COLUMN "manifestVersion" TEXT;
ALTER TABLE "LearningCourse" ADD COLUMN "isOfficial" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "LearningCourse_contentKey_key" ON "LearningCourse"("contentKey");
CREATE INDEX "LearningCourse_isOfficial_idx" ON "LearningCourse"("isOfficial");

ALTER TABLE "LearningCourseModule" ADD COLUMN "contentKey" TEXT;
CREATE UNIQUE INDEX "LearningCourseModule_courseId_contentKey_key" ON "LearningCourseModule"("courseId", "contentKey");

ALTER TABLE "LearningLesson" ADD COLUMN "contentKey" TEXT;
ALTER TABLE "LearningLesson" ADD COLUMN "liveMeta" JSONB;
CREATE UNIQUE INDEX "LearningLesson_moduleId_contentKey_key" ON "LearningLesson"("moduleId", "contentKey");

ALTER TABLE "LearningQuizQuestion" ADD COLUMN "contentKey" TEXT;
CREATE UNIQUE INDEX "LearningQuizQuestion_quizId_contentKey_key" ON "LearningQuizQuestion"("quizId", "contentKey");
