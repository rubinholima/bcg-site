-- Payment → EventTicketOrder (deferido até existir EventTicketOrder).

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventTicketOrderId_fkey" FOREIGN KEY ("eventTicketOrderId") REFERENCES "EventTicketOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
