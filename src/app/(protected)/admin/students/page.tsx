// src/app/(protected)/admin/students/page.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import React from "react";

const PendingApprovals = dynamic(
  () => import("@/features/admin/components/students/management/PendingApprovals").then((mod) => ({
    default: mod.PendingApprovals,
  })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const StudentList = dynamic(
  () => import("@/features/admin/components/students/management/StudentList").then((mod) => ({
    default: mod.StudentList,
  })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const StudentForm = dynamic(
  () => import("@/features/admin/components/students/profile/StudentForm").then((mod) => ({
    default: mod.StudentForm,
  })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const StudentProfile = dynamic(
  () => import("@/features/admin/components/students/profile/StudentProfile").then((mod) => ({
    default: mod.StudentProfile,
  })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const NewStudentDialog = dynamic(
  () => import("@/features/admin/components/students/shared/NewStudentDialog").then((mod) => ({
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <NewStudentDialog />
      </div>

      <PendingApprovals />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">All Students</TabsTrigger>
          {selectedStudentId && <TabsTrigger value="profile">Student Profile</TabsTrigger>}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {selectedStudentId && (
            <StudentForm
              student={{ id: selectedStudentId }}
              onSubmitAction={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
