// src/app/(protected)/admin/coaches/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CoachList = dynamic(
  () =>
    import("@/features/admin/components/coaches/management/CoachList").then((mod) => ({
      default: mod.CoachList,
    })),
  { loading: () => <LoadingSkeleton /> },
);

const CoachPendingApprovals = dynamic(
  () =>
    import("@/features/admin/components/coaches/management/CoachPendingApprovals").then((mod) => ({
      default: mod.CoachPendingApprovals,
    })),
  { loading: () => <LoadingSkeleton /> },
);

const CoachProposalQueue = dynamic(
  () =>
    import("@/features/admin/components/coaches/proposals/CoachProposalQueue").then((mod) => ({
      default: mod.CoachProposalQueue,
    })),
  { loading: () => <LoadingSkeleton /> },
);

const NewCoachDialog = dynamic(
  () =>
    import("@/features/admin/components/coaches/management/NewCoachDialog").then((mod) => ({
      default: mod.NewCoachDialog,
    })),
  { loading: () => <LoadingSkeleton /> },
);

export default function AdminCoachesPage() {
  const [showNewCoach, setShowNewCoach] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Coach Management</h1>
        <div className="self-start sm:self-auto">
          <Button onClick={() => setShowNewCoach(true)}>Add Coach</Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-none lg:flex">
          <TabsTrigger value="all" className="text-sm">
            All Coaches
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-sm">
            Pending Approvals
          </TabsTrigger>
          <TabsTrigger value="proposals" className="text-sm">
            Proposals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CoachList />
        </TabsContent>

        <TabsContent value="pending">
          <CoachPendingApprovals />
        </TabsContent>

        <TabsContent value="proposals">
          <CoachProposalQueue />
        </TabsContent>
      </Tabs>

      <NewCoachDialog open={showNewCoach} onOpenChange={setShowNewCoach} />
    </div>
  );
}
