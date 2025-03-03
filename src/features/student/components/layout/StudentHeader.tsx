// src/features/student/components/layout/StudentHeader.tsx
"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";

export const StudentHeader = () => {
  const router = useRouter();
  
  return (
    <header className="h-16 bg-white border-b shadow-sm">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-blue-500 p-1.5">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-semibold">Yura Min Academy</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              localStorage.clear();
              router.push('/login');
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};