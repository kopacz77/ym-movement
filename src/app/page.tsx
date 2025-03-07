// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function LandingPage() {
  // For now, redirect to login
  // Later this can be a proper landing page
  redirect('/auth/login');
  
  // The function doesn't need to return anything since redirect throws
  // but we'll add a return for TypeScript safety
  return null;
}