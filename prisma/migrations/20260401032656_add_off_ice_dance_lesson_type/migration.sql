-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'OFF_ICE_DANCE';

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "offIceDancePrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DefaultPricing" ADD COLUMN     "offIceDancePrice" DOUBLE PRECISION NOT NULL DEFAULT 75;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "offIceDancePrice" DOUBLE PRECISION;
