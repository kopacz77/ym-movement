import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { SmartKPICards } from "./SmartKPICards";

const meta = {
  title: "Admin/Dashboard/SmartKPICards",
  component: SmartKPICards,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SmartKPICards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                activeLessons: 6,
                monthlyRevenue: 4850,
                totalStudents: 12,
                pendingPayments: 3,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const HighVolume: Story = {
  name: "High Volume Day",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                activeLessons: 14,
                monthlyRevenue: 12400,
                totalStudents: 28,
                pendingPayments: 7,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  name: "No Data",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                activeLessons: 0,
                monthlyRevenue: 0,
                totalStudents: 0,
                pendingPayments: 0,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
