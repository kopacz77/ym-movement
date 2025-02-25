import { AdminSidebar } from '@/features/admin/components/layout/AdminSidebar';

/**
 * AdminLayout wraps all admin pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
