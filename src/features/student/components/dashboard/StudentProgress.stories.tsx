import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { SessionProvider } from "next-auth/react";
import { StudentProgress } from "./StudentProgress";

// Mock session to provide studentId via useCurrentUser hook
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
  title: "Student/Dashboard/StudentProgress",
  component: StudentProgress,
  parameters: {
    layout: "padded",
  },
  decorators: [
    withSession,
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StudentProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessonStats*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                completed: 24,
                upcoming: 3,
                cancelled: 2,
                thisWeekCount: 2,
                maxAllowed: 4,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const NewStudent: Story = {
  name: "New Student (No History)",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessonStats*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                completed: 0,
                upcoming: 1,
                cancelled: 0,
                thisWeekCount: 0,
                maxAllowed: 4,
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
        http.get("*/api/trpc/student.profile.getStudentLessonStats*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
