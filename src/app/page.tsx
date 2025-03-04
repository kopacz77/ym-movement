// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function LandingPage() {
  // For now, redirect to login
  // Later this can be a proper landing page
  redirect('/auth/login');
}