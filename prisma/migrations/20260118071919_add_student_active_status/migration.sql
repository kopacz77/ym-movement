-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedById" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
