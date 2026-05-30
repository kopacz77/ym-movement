import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { SessionProvider } from "next-auth/react";
import { NotificationsPopover } from "./NotificationsPopover";

// Tier-3 notification widget. Self-fetches via api.notifications.notifications.getNotifications
// AND gates rendering on useSession().status === "authenticated". The popover
// content is encapsulated behind internal useState — we don't have a defaultOpen
// hook, so the VRT screenshot captures the BELL + badge trigger surface (which
// is what 99% of users see in the chrome). Open-state coverage is deferred to
// v2.1 (would require a Storybook play function or a wrapper component).

function withSession(Story: React.ComponentType) {
  return (
    <SessionProvider
      session={{
        user: {
          id: "user-1",
          name: "Sarah Chen",
          email: "sarah@example.com",
          role: "STUDENT",
          studentId: "student-1",
        } as any,
        expires: new Date(Date.now() + 86400000).toISOString(),
      }}
    >
      <Story />
    </SessionProvider>
  );
}

const buildNotification = (id: string, title: string, message: string, isRead: boolean) => ({
  id,
  title,
  message,
  isRead,
  createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
});

const meta = {
  title: "Notifications/NotificationsPopover",
  component: NotificationsPopover,
  parameters: { layout: "centered" },
  decorators: [withSession],
} satisfies Meta<typeof NotificationsPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUnread: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/notifications.notifications.getNotifications*", () =>
          HttpResponse.json([
            {
              result: {
                data: [
                  buildNotification("n1", "Lesson confirmed", "Tomorrow at 10:00 AM", false),
                  buildNotification("n2", "Payment received", "$85.00 from Sarah Chen", false),
                  buildNotification("n3", "New message", "Coach Yura sent feedback", false),
                ],
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const AllRead: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/notifications.notifications.getNotifications*", () =>
          HttpResponse.json([
            {
              result: {
                data: [
                  buildNotification("n1", "Lesson confirmed", "Tomorrow at 10:00 AM", true),
                  buildNotification("n2", "Payment received", "$85.00 from Sarah Chen", true),
                ],
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/notifications.notifications.getNotifications*", () =>
          HttpResponse.json([{ result: { data: [] } }]),
        ),
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
