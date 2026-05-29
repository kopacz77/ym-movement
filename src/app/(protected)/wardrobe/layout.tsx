// src/app/(protected)/wardrobe/layout.tsx
//
// AppLayout wrapper for the public-ish wardrobe surface. Phase 14-07 deferred
// this; Phase 15 settles it per research Open Question 4: students see student
// chrome here; admins viewing /wardrobe see the same chrome (they have their
// own /admin/wardrobe surface for inventory management).

import { AppLayout } from "@/components/layout/AppLayout";

export default function WardrobeLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="student">{children}</AppLayout>;
}
