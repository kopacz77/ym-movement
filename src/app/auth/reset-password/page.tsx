// src/app/auth/reset-password/page.tsx
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
