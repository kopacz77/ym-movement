import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { SessionProvider } from "next-auth/react";
import { OutstandingPayments } from "./OutstandingPayments";

// Tier-3 dashboard widget. Self-fetches via api.student.profile.getStudentLessons
// then filters in-component for lesson.Payment.status === "PENDING".
// Component returns null when there are no pending payments — that's why we
// don't ship an explicit ZeroBalance story (it would be a blank screenshot).
// Instead, Loading covers the in-flight state.

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

const baseLesson = (id: string, amount: number, status: "PENDING" | "PAID") => ({
  id,
  type: "PRIVATE",
  status: "COMPLETED",
  startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  endTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60).toISOString(),
  Payment: { id: `pay-${id}`, amount, status },
});

const meta = {
  title: "Student/Dashboard/OutstandingPayments",
  component: OutstandingPayments,
  parameters: { layout: "padded" },
  decorators: [
    withSession,
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OutstandingPayments>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () =>
          HttpResponse.json([
            {
              result: {
                data: [
                  baseLesson("l1", 85, "PENDING"),
                  baseLesson("l2", 120, "PENDING"),
                  baseLesson("l3", 95, "PAID"),
                ],
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const MultiplePayments: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () =>
          HttpResponse.json([
            {
              result: {
                data: [
                  baseLesson("l1", 85, "PENDING"),
                  baseLesson("l2", 120, "PENDING"),
                  baseLesson("l3", 95, "PENDING"),
                  baseLesson("l4", 85, "PENDING"),
                  baseLesson("l5", 120, "PENDING"),
                ],
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const ZeroBalance: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () =>
          HttpResponse.json([
            {
              result: {
                data: [baseLesson("l1", 85, "PAID"), baseLesson("l2", 120, "PAID")],
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
