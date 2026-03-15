-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "BlockedDateRange" ADD COLUMN     "coachId" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "coachId" TEXT;

-- AlterTable
ALTER TABLE "RinkTimeSlot" ADD COLUMN     "coachId" TEXT;

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "skills" TEXT[],
    "certifications" TEXT,
    "yearsExperience" INTEGER,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "privateLessonPrice" DOUBLE PRECISION,
    "groupLessonPrice" DOUBLE PRECISION,
    "choreographyPrice" DOUBLE PRECISION,
    "competitionPrepPrice" DOUBLE PRECISION,
    "revenueSplitPercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "googleCalendarId" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachStudent" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_userId_key" ON "Coach"("userId");

-- CreateIndex
CREATE INDEX "Coach_userId_idx" ON "Coach"("userId");

-- CreateIndex
CREATE INDEX "Coach_isApproved_isActive_idx" ON "Coach"("isApproved", "isActive");

-- CreateIndex
CREATE INDEX "CoachStudent_coachId_idx" ON "CoachStudent"("coachId");

-- CreateIndex
CREATE INDEX "CoachStudent_studentId_idx" ON "CoachStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachStudent_coachId_studentId_key" ON "CoachStudent"("coachId", "studentId");

-- CreateIndex
CREATE INDEX "BlockedDateRange_coachId_idx" ON "BlockedDateRange"("coachId");

-- CreateIndex
CREATE INDEX "Lesson_coachId_idx" ON "Lesson"("coachId");

-- CreateIndex
CREATE INDEX "RinkTimeSlot_coachId_idx" ON "RinkTimeSlot"("coachId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RinkTimeSlot" ADD CONSTRAINT "RinkTimeSlot_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedDateRange" ADD CONSTRAINT "BlockedDateRange_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachStudent" ADD CONSTRAINT "CoachStudent_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachStudent" ADD CONSTRAINT "CoachStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
