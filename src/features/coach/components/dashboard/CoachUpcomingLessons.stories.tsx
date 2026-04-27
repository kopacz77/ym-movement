import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { CoachUpcomingLessons } from "./CoachUpcomingLessons";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const lessons = [
  {
    id: "l1",
    type: "PRIVATE",
    startTime: new Date(tomorrow.setHours(10, 0)).toISOString(),
    endTime: new Date(tomorrow.setHours(11, 0)).toISOString(),
    status: "CONFIRMED",
    Student: { id: "s1", User: { name: "Sarah Chen" } },
  },
  {
    id: "l2",
    type: "CHOREOGRAPHY",
    startTime: new Date(tomorrow.setHours(11, 30)).toISOString(),
    endTime: new Date(tomorrow.setHours(12, 30)).toISOString(),
    status: "CONFIRMED",
    Student: { id: "s2", User: { name: "Alex Kim" } },
  },
  {
    id: "l3",
    type: "GROUP",
    startTime: new Date(tomorrow.setHours(14, 0)).toISOString(),
    endTime: new Date(tomorrow.setHours(15, 0)).toISOString(),
    status: "CONFIRMED",
    Student: { id: "s3", User: { name: "Maria Lopez" } },
  },
  {
    id: "l4",
    type: "COMPETITION_PREP",
    startTime: new Date(tomorrow.setHours(16, 0)).toISOString(),
    endTime: new Date(tomorrow.setHours(17, 0)).toISOString(),
    status: "CONFIRMED",
    Student: { id: "s4", User: { name: "Jake Wilson" } },
  },
];

const meta = {
  title: "Coach/Dashboard/CoachUpcomingLessons",
  component: CoachUpcomingLessons,
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
} satisfies Meta<typeof CoachUpcomingLessons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getUpcomingLessons*", () => {
          return HttpResponse.json([{ result: { data: lessons } }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getUpcomingLessons*", () => {
          return HttpResponse.json([{ result: { data: [] } }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getUpcomingLessons*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
