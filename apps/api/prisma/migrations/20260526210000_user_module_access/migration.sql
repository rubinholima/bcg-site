-- Permissões individuais por usuário (Acessos → modo Usuário)
ALTER TABLE "User" ADD COLUMN "customModuleAccess" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UserModuleAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "canAccess" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserModuleAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserModuleAccess_userId_moduleId_key" ON "UserModuleAccess"("userId", "moduleId");
CREATE INDEX "UserModuleAccess_userId_idx" ON "UserModuleAccess"("userId");
CREATE INDEX "UserModuleAccess_moduleId_idx" ON "UserModuleAccess"("moduleId");

ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
