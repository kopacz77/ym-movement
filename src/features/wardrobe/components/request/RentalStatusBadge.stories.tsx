import type { Meta, StoryObj } from "@storybook/react";
import { RentalStatusBadge } from "./RentalStatusBadge";

const meta = {
  title: "Wardrobe/Request/RentalStatusBadge",
  component: RentalStatusBadge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RentalStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// RentalRequestStatus variants
export const Pending: Story = { args: { status: "PENDING" } };
export const Approved: Story = { args: { status: "APPROVED" } };
export const Declined: Story = { args: { status: "DECLINED" } };
export const Canceled: Story = { args: { status: "CANCELED" } };
export const Converted: Story = { args: { status: "CONVERTED" } };

// RentalPaymentStatus variants
export const AwaitingPayment: Story = { args: { status: "AWAITING_PAYMENT" } };
export const Paid: Story = { args: { status: "PAID" } };
export const Returned: Story = { args: { status: "RETURNED" } };
export const DepositReleased: Story = { args: { status: "DEPOSIT_RELEASED" } };
export const LateFeeOwed: Story = { args: { status: "LATE_FEE_OWED" } };
