// src/app/(protected)/admin/students/page.tsx
"use client";

import { Clock, UserCheck, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

const PendingApprovals = dynamic(
  () =>
    import("@/features/admin/components/students/management/PendingApprovals").then((mod) => ({
      default: mod.PendingApprovals,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const StudentList = dynamic(
  () =>
    import("@/features/admin/components/students/management/StudentList").then((mod) => ({
      default: mod.StudentList,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const StudentForm = dynamic(
  () =>
    import("@/features/admin/components/students/profile/StudentForm").then((mod) => ({
      default: mod.StudentForm,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const StudentProfile = dynamic(
  () =>
    import("@/features/admin/components/students/profile/StudentProfile").then((mod) => ({
      default: mod.StudentProfile,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const NewStudentDialog = dynamic(
  () =>
    import("@/features/admin/components/students/shared/NewStudentDialog").then((mod) => ({
      default: mod.NewStudentDialog,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

export default function AdminStudentsPage() {
  const { status: sessionStatus } = useSession();
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("list");

  // Fetch student stats for KPI cards
  const { data: stats } = api.admin.student.getStudentStats.useQuery(undefined, {
    enabled: sessionStatus === "authenticated",
  });

  const handleViewProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab("profile");
  };

  const handleEdit = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsEditDialogOpen(true);
  };

  const handleEditComplete = () => {
    setIsEditDialogOpen(false);
    // Small delay to ensure smooth dialog close animation before clearing selection
    setTimeout(() => {
      setSelectedStudentId(null);
    }, 300);
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setTimeout(() => {
      setSelectedStudentId(null);
    }, 300);
  };

  // Handle tab changes - clear selected student when returning to list
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "list") {
      setSelectedStudentId(null); // Clear selection when returning to All Students
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your roster, track progress, and oversee student accounts.
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <NewStudentDialog />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Students */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Total Students
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">
                {stats?.total ?? "--"}
              </p>
              <p className="text-xs font-medium text-slate-400">All registered</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-cyan-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Users className="h-7 w-7 text-[#0891b2]" />
            </div>
          </div>
        </div>

        {/* Active */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Active</p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">
                {stats?.approved ?? "--"}
              </p>
              <p className="text-xs font-medium text-emerald-600">Currently training</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <UserCheck className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Pending Approval
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">
                {stats?.unapproved ?? "--"}
              </p>
              <p className="text-xs font-medium text-amber-600">Awaiting review</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <PendingApprovals />

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:w-fit lg:grid-cols-auto">
          <TabsTrigger value="list" className="text-sm">
            All Students
          </TabsTrigger>
          {selectedStudentId && (
            <TabsTrigger value="profile" className="text-sm">
              Student Profile
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list">
          <StudentList onEditAction={handleEdit} onViewProfileAction={handleViewProfile} />
        </TabsContent>

        <TabsContent value="profile">
          {selectedStudentId && (
            <StudentProfile
              studentId={selectedStudentId}
              onEditAction={() => handleEdit(selectedStudentId)}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelEdit();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {selectedStudentId && (
            <StudentForm
              key={selectedStudentId}
              student={{ id: selectedStudentId }}
              onSubmitAction={handleEditComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
