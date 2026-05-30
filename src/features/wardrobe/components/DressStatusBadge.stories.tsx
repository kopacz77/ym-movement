import type { Meta, StoryObj } from "@storybook/react";
import { DressStatusBadge } from "./DressStatusBadge";

// Tier-2 wardrobe widget. Pure prop-driven — no TRPC, no MSW.
// Renders one variant per `DressStatus` enum value (mirrors the STATUS_STYLES
// map in DressStatusBadge.tsx).

const meta = {
  title: "Wardrobe/DressStatusBadge",
  component: DressStatusBadge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DressStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = { args: { status: "AVAILABLE" } };
export const PendingApproval: Story = { args: { status: "PENDING_APPROVAL" } };
export const Pending: Story = { args: { status: "PENDING" } };
export const Rented: Story = { args: { status: "RENTED" } };
export const Maintenance: Story = { args: { status: "MAINTENANCE" } };
export const Rejected: Story = { args: { status: "REJECTED" } };
export const Archived: Story = { args: { status: "ARCHIVED" } };
