import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { TodayTimeline } from "./TodayTimeline";

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

const todayTimeSlots = [
  {
    id: "slot-1",
    startTime: `${todayStr}T14:00:00.000Z`,
    endTime: `${todayStr}T15:00:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [{ id: "l1", type: "PRIVATE", price: 120, status: "CONFIRMED", notes: null, Student: { id: "s1", User: { name: "Sarah Chen" } } }],
  },
  {
    id: "slot-2",
    startTime: `${todayStr}T15:30:00.000Z`,
    endTime: `${todayStr}T16:30:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [{ id: "l2", type: "CHOREOGRAPHY", price: 150, status: "CONFIRMED", notes: "Free skate program", Student: { id: "s2", User: { name: "Alex Kim" } } }],
  },
  {
    id: "slot-3",
    startTime: `${todayStr}T17:00:00.000Z`,
    endTime: `${todayStr}T18:00:00.000Z`,
    maxStudents: 3,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [{ id: "l3", type: "GROUP", price: 60, status: "CONFIRMED", notes: null, Student: { id: "s3", User: { name: "Maria Lopez" } } }],
  },
  {
    id: "slot-4",
    startTime: `${todayStr}T19:00:00.000Z`,
    endTime: `${todayStr}T20:00:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [{ id: "l4", type: "COMPETITION_PREP", price: 180, status: "CONFIRMED", notes: "Regional comp", Student: { id: "s4", User: { name: "Jake Wilson" } } }],
  },
];

const meta = {
  title: "Admin/Dashboard/TodayTimeline",
  component: TodayTimeline,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TodayTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLessons: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.schedule.getTimeSlots*", () => {
          return HttpResponse.json([{ result: { data: todayTimeSlots } }]);
        }),
      ],
    },
  },
};

export const EmptyDay: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.schedule.getTimeSlots*", () => {
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
        http.get("*/api/trpc/admin.schedule.getTimeSlots*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
