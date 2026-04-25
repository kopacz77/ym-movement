import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { RevenueChart } from "./RevenueChart";

const revenueData = [
  { date: "2026-04-01", revenue: 240 },
  { date: "2026-04-03", revenue: 360 },
  { date: "2026-04-05", revenue: 120 },
  { date: "2026-04-07", revenue: 480 },
  { date: "2026-04-09", revenue: 240 },
  { date: "2026-04-11", revenue: 360 },
  { date: "2026-04-13", revenue: 120 },
  { date: "2026-04-15", revenue: 600 },
  { date: "2026-04-17", revenue: 240 },
  { date: "2026-04-19", revenue: 480 },
  { date: "2026-04-21", revenue: 360 },
  { date: "2026-04-23", revenue: 240 },
];

const meta = {
  title: "Admin/Analytics/RevenueChart",
  component: RevenueChart,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RevenueChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", () => {
          return HttpResponse.json([{ result: { data: revenueData } }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", () => {
          return HttpResponse.json(
            [{ error: { message: "Failed to fetch revenue data", code: "INTERNAL_SERVER_ERROR" } }],
            { status: 500 },
          );
        }),
      ],
    },
  },
};

export const EmptyData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", () => {
          return HttpResponse.json([{ result: { data: [] } }]);
        }),
      ],
    },
  },
};
