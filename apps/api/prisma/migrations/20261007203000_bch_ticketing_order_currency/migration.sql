-- BCH Ticketing: moeda explícita (ISO 4217) em config e snapshot do pedido.
-- Backfill USD: padrão operacional BCH (EUA); não inferir por tenant nesta etapa.

ALTER TABLE "EventTicketing" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "EventTicketOrder" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
