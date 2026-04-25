import type { Meta, StoryObj } from "@storybook/react";
import { QuickActions } from "./QuickActions";

const meta = {
  title: "Admin/Dashboard/QuickActions",
  component: QuickActions,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuickActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
