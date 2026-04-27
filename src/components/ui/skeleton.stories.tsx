import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: "h-4 w-[250px]" },
};

export const Circle: Story = {
  args: { className: "h-12 w-12 rounded-full" },
};

export const CardSkeleton: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <Skeleton className="h-5 w-[180px]" />
        <Skeleton className="h-4 w-[250px]" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </CardContent>
    </Card>
  ),
};

export const KPICardSkeleton: Story = {
  name: "KPI Card Loading",
  render: () => (
    <div className="grid grid-cols-2 gap-6 w-[600px]">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-20 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
