// src/app/auth/complete-registration/page.tsx
import { Suspense } from "react";
import { CompleteRegistrationForm } from "./CompleteRegistrationForm";

export default function CompleteRegistrationPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-50 p-4">
      <Suspense
        fallback={
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <CompleteRegistrationForm />
      </Suspense>
    </div>
  );
}
