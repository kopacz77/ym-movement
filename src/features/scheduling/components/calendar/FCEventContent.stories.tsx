import type { Meta, StoryObj } from "@storybook/react";
import { FCEventContent } from "./FCEventContent";

// Helper to create mock EventContentArg objects
function mockEventArg(overrides: {
  title?: string;
  timeText?: string;
  isDraft?: boolean;
  lessonCount?: number;
  maxStudents?: number;
  rinkName?: string;
  coachName?: string;
  textClass?: string;
  bgColor?: string;
  borderColor?: string;
}) {
  return {
    event: {
      title: overrides.title || "",
      extendedProps: {
        isDraft: overrides.isDraft ?? false,
        lessonCount: overrides.lessonCount ?? 1,
        maxStudents: overrides.maxStudents ?? 1,
        rinkName: overrides.rinkName ?? "Arctic Ice Arena",
        coachName: overrides.coachName,
        textClass: overrides.textClass ?? "text-slate-800",
      },
      backgroundColor: overrides.bgColor,
      borderColor: overrides.borderColor,
    },
    timeText: overrides.timeText ?? "2:00 PM - 3:00 PM",
  } as any;
}

// Use Meta<any> because EventContentArg has many required internal FullCalendar fields
// that we mock via the helper function
const meta: Meta = {
  title: "Scheduling/FCEventContent",
  component: FCEventContent as any,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border p-0.5" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const PrivateLesson: Story = {
  args: mockEventArg({
    rinkName: "Arctic Ice Arena",
    lessonCount: 1,
    maxStudents: 1,
    textClass: "text-blue-900",
  }),
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border border-blue-300 bg-blue-100 p-0.5" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export const ChoreographyLesson: Story = {
  args: mockEventArg({
    rinkName: "Glacier Center",
    lessonCount: 1,
    maxStudents: 1,
    textClass: "text-purple-900",
  }),
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border border-purple-300 bg-purple-100 p-0.5" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export const GroupLesson: Story = {
  args: mockEventArg({
    rinkName: "Community Rink",
    lessonCount: 3,
    maxStudents: 5,
    textClass: "text-emerald-900",
  }),
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border border-emerald-300 bg-emerald-100 p-0.5" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export const CompetitionPrep: Story = {
  args: mockEventArg({
    rinkName: "Training Center",
    lessonCount: 1,
    maxStudents: 1,
    textClass: "text-orange-900",
  }),
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border border-orange-300 bg-orange-100 p-0.5" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export const DraftSlot: Story = {
  args: mockEventArg({
    rinkName: "Arctic Ice Arena",
    isDraft: true,
    lessonCount: 0,
    maxStudents: 1,
    textClass: "text-slate-600",
  }),
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border border-slate-300 bg-slate-100 p-0.5 opacity-70" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export const WithCoachName: Story = {
  args: mockEventArg({
    rinkName: "Arctic Ice Arena",
    lessonCount: 2,
    maxStudents: 3,
    coachName: "Yura Min",
    textClass: "text-blue-900",
  }),
  decorators: [
    (Story) => (
      <div className="w-48 rounded-md border border-blue-300 bg-blue-100 p-0.5" style={{ minHeight: 60 }}>
        <Story />
      </div>
    ),
  ],
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex gap-3">
      <div className="w-40 rounded-md border border-blue-300 bg-blue-100 p-0.5" style={{ minHeight: 60 }}>
        <FCEventContent {...mockEventArg({ rinkName: "Arena", textClass: "text-blue-900", lessonCount: 1 })} />
      </div>
      <div className="w-40 rounded-md border border-purple-300 bg-purple-100 p-0.5" style={{ minHeight: 60 }}>
        <FCEventContent {...mockEventArg({ rinkName: "Center", textClass: "text-purple-900", lessonCount: 1 })} />
      </div>
      <div className="w-40 rounded-md border border-emerald-300 bg-emerald-100 p-0.5" style={{ minHeight: 60 }}>
        <FCEventContent {...mockEventArg({ rinkName: "Rink", textClass: "text-emerald-900", lessonCount: 3, maxStudents: 5 })} />
      </div>
      <div className="w-40 rounded-md border border-orange-300 bg-orange-100 p-0.5" style={{ minHeight: 60 }}>
        <FCEventContent {...mockEventArg({ rinkName: "Training", textClass: "text-orange-900", lessonCount: 1 })} />
      </div>
      <div className="w-40 rounded-md border border-slate-300 bg-slate-100 p-0.5 opacity-70" style={{ minHeight: 60 }}>
        <FCEventContent {...mockEventArg({ rinkName: "Draft", isDraft: true, textClass: "text-slate-600", lessonCount: 0 })} />
      </div>
    </div>
  ),
};
