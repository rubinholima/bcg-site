-- AlterTable: add cognitoSub and name to User (sync with Cognito)
ALTER TABLE "User" ADD COLUMN "cognitoSub" TEXT;
ALTER TABLE "User" ADD COLUMN "name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_cognitoSub_key" ON "User"("cognitoSub");
