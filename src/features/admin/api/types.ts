export interface AdminStats {
    totalStudents: number;
    totalLessons: number;
    pendingPayments: number;
    monthlyRevenue: number;
  }
  
  export interface AdminDashboardData {
    stats: AdminStats;
    recentLessons: Lesson[];
    upcomingLessons: Lesson[];
  }
  
  interface Lesson {
    id: string;
    studentName: string;
    startTime: Date;
    endTime: Date;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  }