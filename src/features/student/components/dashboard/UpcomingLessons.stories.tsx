import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { SessionProvider } from "next-auth/react";
import { UpcomingLessons } from "./UpcomingLessons";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const lessonData = [
  {
    id: "l1",
    type: "PRIVATE",
    status: "SCHEDULED",
    startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0).toISOString(),
    endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0).toISOString(),
    Rink: { name: "Arctic Ice Arena", timezone: "America/Los_Angeles" },
    Coach: { User: { name: "Yura Min" } },
  },
  {
    id: "l2",
    type: "CHOREOGRAPHY",
    status: "SCHEDULED",
    startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 2, 14, 0).toISOString(),
    endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 2, 15, 0).toISOString(),
    Rink: { name: "Glacier Skating Center", timezone: "America/Los_Angeles" },
    Coach: { User: { name: "Yura Min" } },
  },
];

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

const meta = {
  title: "Student/Dashboard/UpcomingLessons",
  component: UpcomingLessons,
  parameters: {
    layout: "padded",
  },
  decorators: [
    withSession,
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpcomingLessons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () => {
          return HttpResponse.json([{ result: { data: lessonData } }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () => {
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
        http.get("*/api/trpc/student.profile.getStudentLessons*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
