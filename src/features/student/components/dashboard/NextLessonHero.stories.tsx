import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { SessionProvider } from "next-auth/react";
import { NextLessonHero } from "./NextLessonHero";

// Tier-3 dashboard widget. Self-fetches via api.student.profile.getStudentLessons.
// Pattern mirrors student/dashboard/UpcomingLessons.stories.tsx + StudentProgress.stories.tsx:
// SessionProvider decorator provides the studentId via useCurrentUser, MSW
// handler stubs the TRPC procedure.

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

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);
const tomorrowEnd = new Date(tomorrow);
tomorrowEnd.setHours(11, 0, 0, 0);

const sampleLesson = {
  id: "story-lesson-1",
  type: "PRIVATE",
  status: "SCHEDULED",
  startTime: tomorrow.toISOString(),
  endTime: tomorrowEnd.toISOString(),
  RinkTimeSlot: {
    startTime: tomorrow.toISOString(),
    endTime: tomorrowEnd.toISOString(),
    Rink: { name: "Pickwick Ice", city: "Burbank", timezone: "America/Los_Angeles" },
  },
  Coach: { User: { name: "Yura Min" } },
};

const meta = {
  title: "Student/Dashboard/NextLessonHero",
  component: NextLessonHero,
  parameters: { layout: "padded" },
  decorators: [
    withSession,
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NextLessonHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UpcomingLesson: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () =>
          HttpResponse.json([{ result: { data: [sampleLesson] } }]),
        ),
      ],
    },
  },
};

export const NoUpcomingLessons: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/student.profile.getStudentLessons*", () =>
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
        http.get("*/api/trpc/student.profile.getStudentLessons*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
