"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";

export const AdminHeader = () => {
  const router = useRouter();
  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="text-xl font-semibold">Yura Min Academy</div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Clear auth and redirect to login
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
