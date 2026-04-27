// Admin dashboard fixture data for Storybook stories
export const adminOverview = {
  activeLessons: 6,
  monthlyRevenue: 4850,
  totalStudents: 12,
  pendingPayments: 3,
};

export const revenueReportData = [
  { date: "2026-04-01", revenue: 240 },
  { date: "2026-04-03", revenue: 360 },
  { date: "2026-04-05", revenue: 120 },
  { date: "2026-04-07", revenue: 480 },
  { date: "2026-04-09", revenue: 240 },
  { date: "2026-04-11", revenue: 360 },
  { date: "2026-04-13", revenue: 120 },
  { date: "2026-04-15", revenue: 600 },
  { date: "2026-04-17", revenue: 240 },
  { date: "2026-04-19", revenue: 480 },
  { date: "2026-04-21", revenue: 360 },
  { date: "2026-04-23", revenue: 240 },
];

export const revenueBreakdown = {
  byType: [
    { type: "PRIVATE", revenue: 2400, count: 20 },
    { type: "CHOREOGRAPHY", revenue: 1200, count: 8 },
    { type: "GROUP", revenue: 800, count: 10 },
    { type: "COMPETITION_PREP", revenue: 450, count: 3 },
  ],
};

export const studentActivity = [
  { month: "Jan", active: 8, new: 2, churned: 1 },
  { month: "Feb", active: 9, new: 3, churned: 2 },
  { month: "Mar", active: 10, new: 2, churned: 1 },
  { month: "Apr", active: 12, new: 3, churned: 1 },
];

export const activityFeedItems = [
  {
    id: "1",
    type: "LESSON_BOOKED",
    message: "Sarah Chen booked a Private lesson",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "2",
    type: "PAYMENT_RECEIVED",
    message: "Payment of $120 received from Alex Kim",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "3",
    type: "STUDENT_APPROVED",
    message: "New student Maria Lopez approved",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "4",
    type: "LESSON_CANCELLED",
    message: "Jake Wilson cancelled tomorrow's lesson",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];
