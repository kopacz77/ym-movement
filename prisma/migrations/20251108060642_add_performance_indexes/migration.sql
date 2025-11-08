-- CreateIndex
CREATE INDEX "Lesson_timeSlotId_status_idx" ON "public"."Lesson"("timeSlotId", "status");

-- CreateIndex
CREATE INDEX "Lesson_studentId_status_startTime_idx" ON "public"."Lesson"("studentId", "status", "startTime");

-- CreateIndex
CREATE INDEX "RinkTimeSlot_rinkId_isActive_startTime_idx" ON "public"."RinkTimeSlot"("rinkId", "isActive", "startTime");

-- CreateIndex
CREATE INDEX "RinkTimeSlot_rinkId_startTime_endTime_idx" ON "public"."RinkTimeSlot"("rinkId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "RinkTimeSlot_isActive_startTime_endTime_idx" ON "public"."RinkTimeSlot"("isActive", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "RinkTimeSlot_startTime_endTime_idx" ON "public"."RinkTimeSlot"("startTime", "endTime");
