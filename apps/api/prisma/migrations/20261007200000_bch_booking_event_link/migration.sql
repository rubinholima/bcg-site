-- AlterTable
ALTER TABLE "VenueBooking" ADD COLUMN "eventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VenueBooking_eventId_key" ON "VenueBooking"("eventId");

-- CreateIndex
CREATE INDEX "VenueBooking_eventId_idx" ON "VenueBooking"("eventId");

-- AddForeignKey
ALTER TABLE "VenueBooking" ADD CONSTRAINT "VenueBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
