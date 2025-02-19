// src/app/(protected)/admin/layout.tsx
import { AdminHeader } from '@/features/admin/components/layout/AdminHeader';
import { AdminSidebar } from '@/features/admin/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="flex h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}