-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedById" TEXT,
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "ProposedTimeSlot" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "rinkId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "maxStudents" INTEGER NOT NULL DEFAULT 1,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposedTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposedTimeSlot_coachId_idx" ON "ProposedTimeSlot"("coachId");

-- CreateIndex
CREATE INDEX "ProposedTimeSlot_status_idx" ON "ProposedTimeSlot"("status");

-- CreateIndex
CREATE INDEX "ProposedTimeSlot_coachId_status_idx" ON "ProposedTimeSlot"("coachId", "status");

-- AddForeignKey
ALTER TABLE "ProposedTimeSlot" ADD CONSTRAINT "ProposedTimeSlot_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedTimeSlot" ADD CONSTRAINT "ProposedTimeSlot_rinkId_fkey" FOREIGN KEY ("rinkId") REFERENCES "Rink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
