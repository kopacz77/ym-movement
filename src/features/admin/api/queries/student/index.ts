// src/features/admin/api/queries/student/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { approvalQueries } from "./approvalQueries";
import { noteQueries } from "./noteQueries";
import { pricingQueries } from "./pricingQueries";
import { studentQueries } from "./studentQueries";

// Combine all student-related routers into a single student router
export const studentRouter = createTRPCRouter({
  // Student CRUD operations
  getStudents: studentQueries.getStudents,
  getStudent: studentQueries.getStudent,
  createStudent: studentQueries.createStudent,
  updateStudent: studentQueries.updateStudent,
  toggleStatus: studentQueries.toggleStatus,
  resendInvitation: studentQueries.resendInvitation,

  // Approval operations
  getPendingApprovals: approvalQueries.getPendingApprovals,
  approveStudent: approvalQueries.approveStudent,
  rejectStudent: approvalQueries.rejectStudent,

  // Note operations
  addStudentNote: noteQueries.addStudentNote,

  // Pricing operations
  getDefaultPricing: pricingQueries.getDefaultPricing,
  updateDefaultPricing: pricingQueries.updateDefaultPricing,
  getStudentPricing: pricingQueries.getStudentPricing,
  updateStudentPricing: pricingQueries.updateStudentPricing,
});
