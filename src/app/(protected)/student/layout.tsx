// src/app/(protected)/student/layout.tsx
import { StudentHeader } from '@/features/student/components/layout/StudentHeader';
import { StudentSidebar } from '@/features/student/components/layout/StudentSidebar';

export default function StudentLayout({ children }: { children: React.ReactNode; }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />
      <div className="flex h-[calc(100vh-4rem)]">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}