import type { Meta, StoryObj } from "@storybook/react";
import { BestFitBadge } from "./BestFitBadge";

// Tier-2 wardrobe widget. Pure prop-driven — no TRPC, no MSW.
// Tier coloring (per BestFitBadge.tsx): >=80 emerald, 50..79 cyan, <50 amber.
// Null/undefined renders nothing — `Hidden` variant proves that contract.

const meta = {
  title: "Wardrobe/BestFitBadge",
  component: BestFitBadge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof BestFitBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighFit: Story = { args: { percent: 92 } };
export const MediumFit: Story = { args: { percent: 65 } };
export const LowFit: Story = { args: { percent: 38 } };
export const Hidden: Story = { args: { percent: null } };
