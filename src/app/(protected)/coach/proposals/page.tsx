"use client";

import { ProposalsList } from "@/features/coach/components/proposals/ProposalsList";
import { ProposeAvailabilityForm } from "@/features/coach/components/proposals/ProposeAvailabilityForm";

export default function CoachProposalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Time Slot Proposals</h1>
      <ProposeAvailabilityForm />
      <ProposalsList />
    </div>
  );
}
