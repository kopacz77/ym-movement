export interface AdminOverviewStats {
    totalStudents: number;
    activeLessons: number;
    pendingPayments: number;
  }
  
  export interface AdminUser {
    id: string;
    email: string;
    name?: string;
    role: 'ADMIN';
  }