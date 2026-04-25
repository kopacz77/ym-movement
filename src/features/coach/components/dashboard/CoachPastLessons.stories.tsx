import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { CoachPastLessons } from "./CoachPastLessons";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const pastLessons = [
  {
    id: "pl1",
    type: "PRIVATE",
    startTime: new Date(yesterday.setHours(10, 0)).toISOString(),
    endTime: new Date(yesterday.setHours(11, 0)).toISOString(),
    status: "COMPLETED",
    Student: { id: "s1", User: { name: "Sarah Chen" } },
  },
  {
    id: "pl2",
    type: "CHOREOGRAPHY",
    startTime: new Date(yesterday.setHours(14, 0)).toISOString(),
    endTime: new Date(yesterday.setHours(15, 0)).toISOString(),
    status: "COMPLETED",
    Student: { id: "s2", User: { name: "Alex Kim" } },
  },
  {
    id: "pl3",
    type: "GROUP",
    startTime: new Date(yesterday.setHours(16, 0)).toISOString(),
    endTime: new Date(yesterday.setHours(17, 0)).toISOString(),
    status: "COMPLETED",
    Student: { id: "s3", User: { name: "Maria Lopez" } },
  },
];

const meta = {
  title: "Coach/Dashboard/CoachPastLessons",
  component: CoachPastLessons,
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
} satisfies Meta<typeof CoachPastLessons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getPastLessons*", () => {
          return HttpResponse.json([{ result: { data: pastLessons } }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.dashboard.getPastLessons*", () => {
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
        http.get("*/api/trpc/coach.dashboard.getPastLessons*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
