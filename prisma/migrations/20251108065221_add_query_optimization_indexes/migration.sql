-- CreateIndex
CREATE INDEX "BlockedDateRange_type_startDate_endDate_idx" ON "public"."BlockedDateRange"("type", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "public"."Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "public"."User"("name");
