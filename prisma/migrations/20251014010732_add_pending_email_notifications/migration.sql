-- CreateTable
CREATE TABLE "public"."PendingEmailNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SCHEDULE_CHANGE',
    "lessonId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "PendingEmailNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingEmailNotification_userId_idx" ON "public"."PendingEmailNotification"("userId");

-- CreateIndex
CREATE INDEX "PendingEmailNotification_createdAt_idx" ON "public"."PendingEmailNotification"("createdAt");

-- CreateIndex
CREATE INDEX "PendingEmailNotification_sentAt_idx" ON "public"."PendingEmailNotification"("sentAt");

-- CreateIndex
CREATE INDEX "PendingEmailNotification_userId_sentAt_idx" ON "public"."PendingEmailNotification"("userId", "sentAt");

-- AddForeignKey
ALTER TABLE "public"."PendingEmailNotification" ADD CONSTRAINT "PendingEmailNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
