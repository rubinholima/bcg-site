-- CUP360 Payment Core foundation (provider-independent).

CREATE TABLE "PaymentProviderAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "country" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "enabledCurrencies" JSONB,
    "enabledMethods" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "merchantAccountId" TEXT,
    "credentialsEnc" TEXT,
    "credentialsIv" TEXT,
    "webhookSecretEnc" TEXT,
    "webhookSecretIv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventTicketOrderId" TEXT,
    "venueReceivableInstallmentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "providerFee" DECIMAL(14,2),
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "manualReference" TEXT,
    "manualNotes" TEXT,
    "externalProviderLabel" TEXT,
    "paymentProviderAccountId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymentProviderAccountId" TEXT,
    "attemptSequence" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerPaymentId" TEXT,
    "providerReference" TEXT,
    "requestedMethod" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "responseMetadata" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentProviderAccountId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadMetadata" JSONB,
    "payloadHash" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_exactly_one_origin_check" CHECK (
  (
    CASE WHEN "eventTicketOrderId" IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN "venueReceivableInstallmentId" IS NOT NULL THEN 1 ELSE 0 END
  ) = 1
);

CREATE UNIQUE INDEX "Payment_eventTicketOrderId_key" ON "Payment"("eventTicketOrderId");
CREATE UNIQUE INDEX "Payment_venueReceivableInstallmentId_key" ON "Payment"("venueReceivableInstallmentId");
CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId", "idempotencyKey");
CREATE INDEX "Payment_tenantId_status_idx" ON "Payment"("tenantId", "status");
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");

CREATE UNIQUE INDEX "PaymentAttempt_tenantId_idempotencyKey_key" ON "PaymentAttempt"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_attemptSequence_key" ON "PaymentAttempt"("paymentId", "attemptSequence");
CREATE INDEX "PaymentAttempt_paymentId_idx" ON "PaymentAttempt"("paymentId");
CREATE INDEX "PaymentAttempt_tenantId_idx" ON "PaymentAttempt"("tenantId");

CREATE UNIQUE INDEX "PaymentRefund_tenantId_idempotencyKey_key" ON "PaymentRefund"("tenantId", "idempotencyKey");
CREATE INDEX "PaymentRefund_paymentId_idx" ON "PaymentRefund"("paymentId");
CREATE INDEX "PaymentRefund_tenantId_idx" ON "PaymentRefund"("tenantId");

CREATE UNIQUE INDEX "PaymentWebhookEvent_paymentProviderAccountId_providerEventId_key" ON "PaymentWebhookEvent"("paymentProviderAccountId", "providerEventId");
CREATE INDEX "PaymentWebhookEvent_tenantId_idx" ON "PaymentWebhookEvent"("tenantId");
CREATE INDEX "PaymentWebhookEvent_processingStatus_idx" ON "PaymentWebhookEvent"("processingStatus");

CREATE INDEX "PaymentProviderAccount_tenantId_idx" ON "PaymentProviderAccount"("tenantId");
CREATE INDEX "PaymentProviderAccount_tenantId_providerKey_active_idx" ON "PaymentProviderAccount"("tenantId", "providerKey", "active");

ALTER TABLE "PaymentProviderAccount" ADD CONSTRAINT "PaymentProviderAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- FK EventTicketOrder adicionada em 20261007226000 (após criação de EventTicketOrder).
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_venueReceivableInstallmentId_fkey" FOREIGN KEY ("venueReceivableInstallmentId") REFERENCES "VenueReceivableInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentProviderAccountId_fkey" FOREIGN KEY ("paymentProviderAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentProviderAccountId_fkey" FOREIGN KEY ("paymentProviderAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentProviderAccountId_fkey" FOREIGN KEY ("paymentProviderAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
