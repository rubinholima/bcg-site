-- AlterTable Employee: documentação RH estendida
ALTER TABLE "Employee" ADD COLUMN "address" JSONB;
ALTER TABLE "Employee" ADD COLUMN "pisNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN "voterTitle" TEXT;
ALTER TABLE "Employee" ADD COLUMN "ctpsUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN "pixKey" TEXT;
ALTER TABLE "Employee" ADD COLUMN "admissionMedicalExamDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "admissionMedicalExamFileUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN "dismissalMedicalExamDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "dismissalMedicalExamFileUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN "hasMinorChildren" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable EmployeeDependent
CREATE TABLE "EmployeeDependent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthCertificateFileUrl" TEXT,
    "schoolAttendanceFileUrl" TEXT,
    "vaccinationCardFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDependent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeDependent_employeeId_idx" ON "EmployeeDependent"("employeeId");

ALTER TABLE "EmployeeDependent" ADD CONSTRAINT "EmployeeDependent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
