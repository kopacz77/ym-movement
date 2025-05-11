// src/app/(protected)/student/layout.tsx
"use client";

import { MobileNavigation } from "@/components/mobile-navigation";
import { StudentHeader } from "@/features/student/components/layout/StudentHeader";
import { StudentSidebar } from "@/features/student/components/layout/StudentSidebar";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-zinc-50">
      <StudentHeader />
      <div className="flex h-[calc(100vh-4rem)]">
        <StudentSidebar />
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isMobile ? "pb-20" : ""}`}>
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
