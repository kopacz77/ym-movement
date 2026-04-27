import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { ActivityFeed } from "./ActivityFeed";

const notifications = [
  {
    id: "1",
    title: "Payment received",
    message: "Sarah Chen paid $120 for Private lesson",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
  },
  {
    id: "2",
    title: "Lesson booked",
    message: "Alex Kim booked a Choreography lesson for Friday",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
  },
  {
    id: "3",
    title: "New registration",
    message: "Maria Lopez signed up as a new student",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: true,
  },
  {
    id: "4",
    title: "Lesson cancelled",
    message: "Jake Wilson cancelled tomorrow's lesson",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    read: true,
  },
  {
    id: "5",
    title: "Payment overdue",
    message: "Reminder sent to Emily Park for $240 balance",
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    read: true,
  },
];

const meta = {
  title: "Admin/Dashboard/ActivityFeed",
  component: ActivityFeed,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/notifications.notifications.getNotifications*", () => {
          return HttpResponse.json([{ result: { data: notifications } }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/notifications.notifications.getNotifications*", () => {
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
        http.get("*/api/trpc/notifications.notifications.getNotifications*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
