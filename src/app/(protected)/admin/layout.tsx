// src/app/(protected)/admin/layout.tsx
"use client";

import { AdminHeader } from '@/features/admin/components/layout/AdminHeader';
import { AdminSidebar } from '@/features/admin/components/layout/AdminSidebar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { MobileNavigation } from '@/components/mobile-navigation';

export default function AdminLayout({ children }: { children: React.ReactNode; }) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader />
      <div className="flex h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}