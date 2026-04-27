import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Badge" },
};

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
};

export const Destructive: Story = {
  args: { children: "Destructive", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Outline", variant: "outline" },
};

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large", size: "lg" },
};

export const LessonTypes: Story = {
  name: "Lesson Type Badges",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Private</Badge>
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">Choreography</Badge>
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Group</Badge>
      <Badge className="bg-orange-100 text-orange-800 border-orange-200">Competition Prep</Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};
