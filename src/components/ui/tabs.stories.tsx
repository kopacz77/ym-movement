import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

// Tier-1 UI primitive. Composition demo — no TRPC, no MSW.

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[480px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="lessons">Lessons</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-slate-600 py-4">
        Overview content — KPIs, recent activity, quick actions.
      </TabsContent>
      <TabsContent value="lessons" className="text-sm text-slate-600 py-4">
        Lessons content — calendar and upcoming schedule.
      </TabsContent>
      <TabsContent value="payments" className="text-sm text-slate-600 py-4">
        Payments content — outstanding balance and history.
      </TabsContent>
    </Tabs>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Tabs defaultValue="inbox" className="w-[480px]">
      <TabsList>
        <TabsTrigger value="inbox" className="gap-2">
          Inbox
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
            3
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="archive">Archive</TabsTrigger>
        <TabsTrigger value="trash">Trash</TabsTrigger>
      </TabsList>
      <TabsContent value="inbox" className="text-sm text-slate-600 py-4">
        Inbox — 3 unread notifications.
      </TabsContent>
      <TabsContent value="archive" className="text-sm text-slate-600 py-4">
        Archive — older notifications.
      </TabsContent>
      <TabsContent value="trash" className="text-sm text-slate-600 py-4">
        Trash — empty.
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[640px]">
      <TabsList>
        {Array.from({ length: 8 }, (_, i) => (
          <TabsTrigger key={`t${i + 1}`} value={`tab${i + 1}`}>
            Section {i + 1}
          </TabsTrigger>
        ))}
      </TabsList>
      {Array.from({ length: 8 }, (_, i) => (
        <TabsContent
          key={`c${i + 1}`}
          value={`tab${i + 1}`}
          className="text-sm text-slate-600 py-4"
        >
          Section {i + 1} content.
        </TabsContent>
      ))}
    </Tabs>
  ),
};
