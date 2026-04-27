import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { StudentActivityChart } from "./StudentActivityChart";

const activityData = [
  {
    date: "2026-04-01",
    totalLessons: 8,
    completedLessons: 7,
    cancelledLessons: 1,
    byType: { PRIVATE: 5, GROUP: 3 },
    byArea: {},
  },
  {
    date: "2026-04-02",
    totalLessons: 6,
    completedLessons: 6,
    cancelledLessons: 0,
    byType: { PRIVATE: 4, CHOREOGRAPHY: 2 },
    byArea: {},
  },
  {
    date: "2026-04-03",
    totalLessons: 10,
    completedLessons: 9,
    cancelledLessons: 1,
    byType: { PRIVATE: 6, GROUP: 4 },
    byArea: {},
  },
  {
    date: "2026-04-04",
    totalLessons: 7,
    completedLessons: 5,
    cancelledLessons: 2,
    byType: { PRIVATE: 5, COMPETITION_PREP: 2 },
    byArea: {},
  },
  {
    date: "2026-04-05",
    totalLessons: 4,
    completedLessons: 4,
    cancelledLessons: 0,
    byType: { PRIVATE: 2, CHOREOGRAPHY: 2 },
    byArea: {},
  },
  {
    date: "2026-04-06",
    totalLessons: 0,
    completedLessons: 0,
    cancelledLessons: 0,
    byType: {},
    byArea: {},
  },
  {
    date: "2026-04-07",
    totalLessons: 9,
    completedLessons: 8,
    cancelledLessons: 1,
    byType: { PRIVATE: 5, GROUP: 4 },
    byArea: {},
  },
];

const meta = {
  title: "Admin/Analytics/StudentActivityChart",
  component: StudentActivityChart,
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
} satisfies Meta<typeof StudentActivityChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getStudentActivity*", () => {
          return HttpResponse.json([{ result: { data: activityData } }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getStudentActivity*", async () => {
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
        http.get("*/api/trpc/admin.analytics.getStudentActivity*", () => {
          return HttpResponse.json(
            [
              {
                error: {
                  message: "Failed to fetch student activity",
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
