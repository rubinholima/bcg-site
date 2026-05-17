-- CreateTable
CREATE TABLE "FinanceiroLancamento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "contraparte" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "categoria" TEXT,
    "referencia" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceiroLancamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceiroLancamento_tenantId_idx" ON "FinanceiroLancamento"("tenantId");

-- CreateIndex
CREATE INDEX "FinanceiroLancamento_tenantId_tipo_idx" ON "FinanceiroLancamento"("tenantId", "tipo");

-- CreateIndex
CREATE INDEX "FinanceiroLancamento_tenantId_status_idx" ON "FinanceiroLancamento"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FinanceiroLancamento_tenantId_dueDate_idx" ON "FinanceiroLancamento"("tenantId", "dueDate");

-- AddForeignKey
ALTER TABLE "FinanceiroLancamento" ADD CONSTRAINT "FinanceiroLancamento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
