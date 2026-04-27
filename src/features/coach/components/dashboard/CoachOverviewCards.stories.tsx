import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { CoachOverviewCards } from "./CoachOverviewCards";

const meta = {
  title: "Coach/Dashboard/CoachOverviewCards",
  component: CoachOverviewCards,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof CoachOverviewCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getDashboardStats*", () => {
          return HttpResponse.json([
            {
              result: {
                data: {
                  totalStudents: 8,
                  upcomingLessons: 5,
                  completedThisMonth: 18,
                  earningsThisMonth: 2640,
                },
              },
            },
          ]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  name: "New Coach",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getDashboardStats*", () => {
          return HttpResponse.json([
            {
              result: {
                data: {
                  totalStudents: 0,
                  upcomingLessons: 0,
                  completedThisMonth: 0,
                  earningsThisMonth: 0,
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
        http.get("*/api/trpc/coach.dashboard.getDashboardStats*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
