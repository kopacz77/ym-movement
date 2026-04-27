// Scheduling fixture data for Storybook stories

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

export const todayTimeSlots = [
  {
    id: "slot-1",
    startTime: `${todayStr}T14:00:00.000Z`,
    endTime: `${todayStr}T15:00:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-1",
        type: "PRIVATE",
        price: 120,
        status: "CONFIRMED",
        notes: null,
        Student: { id: "s1", User: { name: "Sarah Chen" } },
      },
    ],
  },
  {
    id: "slot-2",
    startTime: `${todayStr}T15:30:00.000Z`,
    endTime: `${todayStr}T16:30:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-2",
        type: "CHOREOGRAPHY",
        price: 150,
        status: "CONFIRMED",
        notes: "Working on free skate program",
        Student: { id: "s2", User: { name: "Alex Kim" } },
      },
    ],
  },
  {
    id: "slot-3",
    startTime: `${todayStr}T17:00:00.000Z`,
    endTime: `${todayStr}T18:00:00.000Z`,
    maxStudents: 3,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-3",
        type: "GROUP",
        price: 60,
        status: "CONFIRMED",
        notes: null,
        Student: { id: "s3", User: { name: "Maria Lopez" } },
      },
    ],
  },
  {
    id: "slot-4",
    startTime: `${todayStr}T19:00:00.000Z`,
    endTime: `${todayStr}T20:00:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-4",
        type: "COMPETITION_PREP",
        price: 180,
        status: "CONFIRMED",
        notes: "Regional competition prep",
        Student: { id: "s4", User: { name: "Jake Wilson" } },
      },
    ],
  },
];

export const emptyTimeSlots: typeof todayTimeSlots = [];
