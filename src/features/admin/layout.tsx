// src/features/admin/layout.tsx
"use client";

import { AdminSidebar } from '@/features/admin/components/layout/AdminSidebar';
import { useState, useEffect } from 'react';

/**
 * AdminLayout wraps all admin pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Run on mount and window resize
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
}