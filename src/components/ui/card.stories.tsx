import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area. It supports any content.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
        <CardDescription>Monthly overview</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">$4,850</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>Are you sure you want to proceed?</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
  ),
};

export const LoadingSkeleton: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="p-6">
        <div className="h-20 animate-pulse bg-muted rounded" />
      </CardContent>
    </Card>
  ),
};

export const KPICard: Story = {
  name: "KPI Card (Dashboard Style)",
  render: () => (
    <Card className="w-[280px] group hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Revenue This Month
            </p>
            <p className="text-3xl font-bold tracking-tight text-primary">$4,850</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <span className="text-emerald-600 text-lg">$</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};
