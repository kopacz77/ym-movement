BEGIN;

-- CreateEnum
CREATE TYPE "DressCategory" AS ENUM ('CLASSICAL', 'DRAMATIC', 'THEMED', 'ICE_DANCE_PARTNER', 'ICE_DANCE_SINGLE', 'COMPETITION', 'TEST');

-- CreateEnum
CREATE TYPE "DressCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GENTLY_USED', 'USED');

-- CreateEnum
CREATE TYPE "DressStatus" AS ENUM ('PENDING_APPROVAL', 'AVAILABLE', 'PENDING', 'RENTED', 'MAINTENANCE', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('COMPETITION', 'SEASONAL', 'PURCHASE');

-- CreateEnum
CREATE TYPE "RentalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CONVERTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "RentalPaymentStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'RETURNED', 'DEPOSIT_RELEASED', 'LATE_FEE_OWED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "chestCm" INTEGER,
ADD COLUMN     "waistCm" INTEGER,
ADD COLUMN     "hipsCm" INTEGER,
ADD COLUMN     "torsoCm" INTEGER,
ADD COLUMN     "inseamCm" INTEGER,
ADD COLUMN     "sleeveLengthCm" INTEGER,
ADD COLUMN     "preferredFitNotes" TEXT,
ADD COLUMN     "measurementsUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Dress" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "DressCategory" NOT NULL,
    "themeTags" TEXT[],
    "color" TEXT NOT NULL,
    "secondaryColors" TEXT[],
    "condition" "DressCondition" NOT NULL,
    "yearMade" INTEGER,
    "sizeLabel" TEXT NOT NULL,
    "chestMinCm" INTEGER,
    "chestMaxCm" INTEGER,
    "waistMinCm" INTEGER,
    "waistMaxCm" INTEGER,
    "hipsMinCm" INTEGER,
    "hipsMaxCm" INTEGER,
    "torsoMinCm" INTEGER,
    "torsoMaxCm" INTEGER,
    "lengthCm" INTEGER,
    "alterableSmaller" BOOLEAN NOT NULL DEFAULT false,
    "alterableLarger" BOOLEAN NOT NULL DEFAULT false,
    "competitionPrice" INTEGER NOT NULL DEFAULT 5000,
    "seasonalPrice" INTEGER NOT NULL DEFAULT 37500,
    "purchasePrice" INTEGER,
    "securityDeposit" INTEGER NOT NULL DEFAULT 20000,
    "cleaningFee" INTEGER NOT NULL DEFAULT 3000,
    "consignmentCommissionPct" INTEGER NOT NULL DEFAULT 0,
    "status" "DressStatus" NOT NULL DEFAULT 'AVAILABLE',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Dress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DressImage" (
    "id" TEXT NOT NULL,
    "dressId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DressImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalRequest" (
    "id" TEXT NOT NULL,
    "dressId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rentalType" "RentalType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "competitionName" TEXT,
    "competitionDate" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "status" "RentalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "ownerResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RentalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "dressId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "rentalType" "RentalType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentalFee" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL,
    "securityDeposit" INTEGER NOT NULL,
    "totalCharged" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "RentalPaymentStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "depositCollectedAt" TIMESTAMP(3),
    "depositReleasedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "conditionOnReturn" TEXT,
    "consignmentPayoutAmount" INTEGER,
    "consignmentPaidOut" BOOLEAN NOT NULL DEFAULT false,
    "consignmentPaidOutAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dress_status_idx" ON "Dress"("status");

-- CreateIndex
CREATE INDEX "Dress_category_idx" ON "Dress"("category");

-- CreateIndex
CREATE INDEX "Dress_ownerId_idx" ON "Dress"("ownerId");

-- CreateIndex
CREATE INDEX "DressImage_dressId_idx" ON "DressImage"("dressId");

-- CreateIndex
CREATE INDEX "RentalRequest_dressId_idx" ON "RentalRequest"("dressId");

-- CreateIndex
CREATE INDEX "RentalRequest_studentId_idx" ON "RentalRequest"("studentId");

-- CreateIndex
CREATE INDEX "RentalRequest_status_idx" ON "RentalRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Rental_requestId_key" ON "Rental"("requestId");

-- CreateIndex
CREATE INDEX "Rental_dressId_idx" ON "Rental"("dressId");

-- CreateIndex
CREATE INDEX "Rental_studentId_idx" ON "Rental"("studentId");

-- CreateIndex
CREATE INDEX "Rental_paymentStatus_idx" ON "Rental"("paymentStatus");

-- AddForeignKey
ALTER TABLE "Dress" ADD CONSTRAINT "Dress_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DressImage" ADD CONSTRAINT "DressImage_dressId_fkey" FOREIGN KEY ("dressId") REFERENCES "Dress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalRequest" ADD CONSTRAINT "RentalRequest_dressId_fkey" FOREIGN KEY ("dressId") REFERENCES "Dress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalRequest" ADD CONSTRAINT "RentalRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_dressId_fkey" FOREIGN KEY ("dressId") REFERENCES "Dress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RentalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
