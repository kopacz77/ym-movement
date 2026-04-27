import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { RevenueBreakdownChart } from "./RevenueBreakdownChart";

const breakdownData = {
  coaches: [
    {
      coachId: "c1",
      name: "Yura Min",
      revenueSplitPercent: 70,
      totalRevenue: 4850,
      coachPayout: 3395,
      platformRevenue: 1455,
      lessonCount: 42,
    },
    {
      coachId: "c2",
      name: "Alex Thompson",
      revenueSplitPercent: 65,
      totalRevenue: 2400,
      coachPayout: 1560,
      platformRevenue: 840,
      lessonCount: 20,
    },
  ],
  totals: {
    totalRevenue: 7250,
    totalCoachPayouts: 4955,
    totalPlatformRevenue: 2295,
  },
};

const meta = {
  title: "Admin/Analytics/RevenueBreakdownChart",
  component: RevenueBreakdownChart,
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
} satisfies Meta<typeof RevenueBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.superAdmin.getRevenueBreakdown*", () => {
          return HttpResponse.json([{ result: { data: breakdownData } }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  name: "No Revenue",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.superAdmin.getRevenueBreakdown*", () => {
          return HttpResponse.json([
            {
              result: {
                data: {
                  coaches: [],
                  totals: { totalRevenue: 0, totalCoachPayouts: 0, totalPlatformRevenue: 0 },
                },
              },
            },
          ]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.superAdmin.getRevenueBreakdown*", async () => {
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
        http.get("*/api/trpc/admin.superAdmin.getRevenueBreakdown*", () => {
          return HttpResponse.json(
            [
              {
                error: {
                  message: "Failed to load revenue breakdown",
                  code: "INTERNAL_SERVER_ERROR",
                },
              },
            ],
            { status: 500 },
          );
        }),
      ],
    },
  },
};
