// src/app/(protected)/admin/students/page.tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("list");

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Students</h1>
        <div className="self-start sm:self-auto">
          <NewStudentDialog />
        </div>
      </div>

      <PendingApprovals />

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
