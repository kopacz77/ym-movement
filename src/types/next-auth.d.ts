import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      studentId?: string | null;
      coachId?: string | null;
      isApproved?: boolean | null;
      isActive?: boolean | null;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    studentId?: string | null;
    coachId?: string | null;
    isApproved?: boolean | null;
    isActive?: boolean | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    studentId?: string | null;
    coachId?: string | null;
    isApproved?: boolean | null;
    isActive?: boolean | null;
  }
}
