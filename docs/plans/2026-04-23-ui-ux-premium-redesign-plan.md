# UI/UX Premium Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform all three dashboards (admin, student, coach) from generic SaaS to elegant, premium, brand-aligned experience while preserving the current blue/indigo palette and immutable layout architecture.

**Architecture:** CSS-first approach — update fonts, shadows, and spacing at the theme level first, then refine each dashboard component. No structural changes to data flow or APIs. All changes are visual/presentational.

**Tech Stack:** Next.js 16, Tailwind CSS, shadcn/ui, Plus Jakarta Sans (Google Fonts), Lucide icons

**Design doc:** `docs/plans/2026-04-23-ui-ux-premium-redesign.md`

---

## Task 1: Add Plus Jakarta Sans Font

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update font imports and config**

Replace the Geist Sans import with Plus Jakarta Sans from Google Fonts. Keep Playfair Display for display headings.

```tsx
// src/app/layout.tsx — FULL FILE
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { validateEnvironment } from "@/lib/env-check";
import { Providers } from "@/providers";

import "@/styles/globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

// Validate environment on app startup
validateEnvironment();

export const metadata: Metadata = {
  title: "YM Movement",
  description: "Professional skating lesson scheduling platform",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YM Movement",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <Providers>
          {children}
          {/* Development performance monitor */}
          {process.env.NODE_ENV === "development" && <div id="performance-monitor-root" />}
        </Providers>
      </body>
    </html>
  );
}
```

**Step 2: Update Tailwind config to use new font variable**

In `tailwind.config.js`, add `sans` font family entry:

```js
// Inside theme.extend.fontFamily — ADD this entry alongside existing "display"
sans: ["var(--font-sans)", "system-ui", "sans-serif"],
```

**Step 3: Verify the font renders**

Run: `pnpm dev`
Expected: Open http://localhost:3100 — all body text should render in Plus Jakarta Sans (rounder, friendlier than Geist). Playfair Display still shows on landing page headings.

**Step 4: Run type check**

Run: `pnpm type-check`
Expected: PASS with no errors

**Step 5: Commit**

```bash
git add src/app/layout.tsx tailwind.config.js
git commit -m "feat: switch body font to Plus Jakarta Sans for premium feel"
```

---

## Task 2: Update Card Shadow System & Border Treatment

**Files:**
- Modify: `src/components/ui/card.tsx`

**Step 1: Update Card base component**

Replace the default `shadow-sm` and `border` classes with the refined multi-layer shadow and softer border:

```tsx
// In Card function — update className
// OLD:
"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"
// NEW:
"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/40 py-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)]"
```

**Step 2: Verify cards render with new shadows**

Run: `pnpm dev`
Expected: All cards across the app should have softer borders and refined multi-layer shadows. The shadow should be subtle but give more depth than the old `shadow-sm`.

**Step 3: Run type check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: refine card shadow system with multi-layer shadows and softer borders"
```

---

## Task 3: Redesign Admin KPI Cards (SmartKPICards)

**Files:**
- Modify: `src/features/admin/components/dashboard/SmartKPICards.tsx`

**Step 1: Update SmartKPICards component**

Remove `border-l-4`, bump value text to `text-3xl`, use `rounded-xl` icon containers instead of `rounded-full`, remove gradient backgrounds on icon containers, add smooth hover transition:

```tsx
// src/features/admin/components/dashboard/SmartKPICards.tsx — FULL FILE
"use client";

import { AlertCircle, Calendar, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export function SmartKPICards() {
  const { data: overview, isLoading } = api.admin.analytics.getOverview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Schedule",
      value: `${overview.activeLessons || 0}`,
      unit: "lessons",
      icon: Calendar,
      iconBg: "bg-cyan-50",
      iconColor: "text-cyan-600",
      href: "/admin/schedule",
    },
    {
      title: "Revenue This Month",
      value: `$${(overview.monthlyRevenue || 0).toLocaleString()}`,
      unit: "",
      icon: CreditCard,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/admin/payments",
    },
    {
      title: "Active Students",
      value: `${overview.totalStudents || 0}`,
      unit: "",
      icon: Users,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      href: "/admin/students",
    },
    {
      title: "Pending Actions",
      value: `${overview.pendingPayments || 0}`,
      unit: "need attention",
      icon: AlertCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/admin/students",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {card.value}
                    {card.unit && (
                      <span className="text-sm font-normal text-muted-foreground ml-1.5">
                        {card.unit}
                      </span>
                    )}
                  </h3>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}
                >
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

**Key changes from current:**
- Removed `border-l-4 ${card.borderColor}` — no more colored left borders
- Removed `borderColor` from card data
- Icon containers: `rounded-xl` instead of `rounded-full`, flat `bg-{color}-50` instead of `bg-gradient-to-br`
- Value: `text-3xl` (was `text-2xl`) with `tracking-tight`
- Unit text: `text-sm` (was `text-base`)
- Hover: `-translate-y-1` (was `-translate-y-0.5`) with explicit elevated shadow
- Padding: `p-6` (was `p-5`)

**Step 2: Verify admin dashboard KPI cards**

Run: `pnpm dev`
Navigate to: http://localhost:3100/admin/dashboard
Expected: 4 KPI cards with larger numbers, no left borders, clean rounded icon containers, smooth hover lift.

**Step 3: Run type check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/admin/components/dashboard/SmartKPICards.tsx
git commit -m "feat: redesign admin KPI cards — remove borders, larger values, refined icons"
```

---

## Task 4: Redesign Coach KPI Cards (CoachOverviewCards)

**Files:**
- Modify: `src/features/coach/components/dashboard/CoachOverviewCards.tsx`

**Step 1: Update CoachOverviewCards to match new design**

Apply the same pattern as SmartKPICards — remove `border-l-4`, flat icon bg, larger values:

```tsx
// src/features/coach/components/dashboard/CoachOverviewCards.tsx — FULL FILE
"use client";

import { Calendar, CheckCircle, DollarSign, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export function CoachOverviewCards() {
  const { data: stats, isLoading } = api.coach.dashboard.getDashboardStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Upcoming Lessons",
      value: stats?.upcomingLessons ?? 0,
      icon: Calendar,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Completed This Month",
      value: stats?.completedThisMonth ?? 0,
      icon: CheckCircle,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      title: "Monthly Earnings",
      value: `$${(stats?.earningsThisMonth ?? 0).toFixed(2)}`,
      icon: DollarSign,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                <div className="text-3xl font-bold tracking-tight">{card.value}</div>
              </div>
              <div
                className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}
              >
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 2: Verify coach dashboard**

Navigate to: http://localhost:3100/coach/dashboard
Expected: Same clean KPI style as admin — no left borders, larger numbers, rounded-xl icon containers.

**Step 3: Commit**

```bash
git add src/features/coach/components/dashboard/CoachOverviewCards.tsx
git commit -m "feat: redesign coach KPI cards to match premium design system"
```

---

## Task 5: Refine Activity Feed

**Files:**
- Modify: `src/features/admin/components/dashboard/ActivityFeed.tsx`

**Step 1: Update ActivityFeed with thinner timeline and more spacing**

```tsx
// In ActivityFeed.tsx, update the timeline section (lines 31-49)
// Changes: thinner connecting line, more spacing, refined dots

// OLD line 33 — connecting line:
<div className="absolute left-[7px] top-2 bottom-4 w-px bg-gradient-to-b from-primary via-accent/50 to-muted" />
// NEW — simpler, thinner line:
<div className="absolute left-[7px] top-2 bottom-4 w-px bg-border" />

// OLD line 34 — space-y-5:
<div className="space-y-5">
// NEW — more breathing room:
<div className="space-y-6">

// OLD line 38 — dot styling:
className={`absolute left-[-5px] top-1.5 w-3 h-3 rounded-full border-2 border-background z-10 ${item.isRead ? "bg-muted-foreground/30" : "bg-primary ring-2 ring-primary/20"}`}
// NEW — smaller, refined dots:
className={`absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background z-10 ${item.isRead ? "bg-muted-foreground/20" : "bg-primary ring-2 ring-primary/15"}`}
```

**Step 2: Verify activity feed**

Navigate to: http://localhost:3100/admin/dashboard
Expected: Activity feed has thinner connecting line, more vertical spacing between items, smaller refined dots.

**Step 3: Commit**

```bash
git add src/features/admin/components/dashboard/ActivityFeed.tsx
git commit -m "feat: refine activity feed — thinner timeline, more whitespace, smaller dots"
```

---

## Task 6: Refine Quick Actions

**Files:**
- Modify: `src/features/admin/components/dashboard/QuickActions.tsx`

**Step 1: Remove icon scale animation, refine hover**

```tsx
// In QuickActions.tsx, update the action link (line 54)
// OLD:
className={`flex flex-col items-center justify-center p-4 bg-muted/30 ${action.hoverBg} border border-border/50 rounded-lg transition-colors group`}
// NEW — cleaner hover without group scale:
className={`flex flex-col items-center justify-center p-5 rounded-xl border border-border/40 ${action.hoverBg} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}

// OLD icon container (line 57):
className={`w-10 h-10 rounded-full ${action.iconBg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
// NEW — no scale animation:
className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center mb-2`}

// OLD label (line 60):
<span className="text-xs font-medium text-center">{action.label}</span>
// NEW — slightly larger text:
<span className="text-sm font-medium text-center">{action.label}</span>
```

**Step 2: Verify quick actions**

Expected: Quick action cards have rounded-xl, subtle hover lift, no icon scale on hover, slightly larger labels.

**Step 3: Commit**

```bash
git add src/features/admin/components/dashboard/QuickActions.tsx
git commit -m "feat: refine quick actions — cleaner hover, rounded-xl, no scale animation"
```

---

## Task 7: Update Admin Dashboard Page Layout

**Files:**
- Modify: `src/app/(protected)/admin/dashboard/page.tsx`

**Step 1: Replace gradient section dividers with clean headers, remove chart border-top accents**

```tsx
// Line 57 — page heading:
// OLD:
<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
// NEW:
<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>

// Lines 74-81 — Analytics section header:
// OLD (gradient lines with text):
<div className="flex items-center gap-3">
  <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent" />
  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
    Analytics
  </h2>
  <div className="h-px flex-1 bg-gradient-to-l from-primary/20 via-accent/10 to-transparent" />
</div>
// NEW (clean editorial header):
<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
  Analytics
</h2>

// Lines 84-91 — Chart wrappers:
// OLD (colored top borders):
<div className="rounded-lg border border-t-4 border-t-cyan-500 overflow-hidden">
  <RevenueChart />
</div>
// NEW (clean wrapper):
<ErrorBoundary>
  <RevenueChart />
</ErrorBoundary>

// OLD:
<div className="rounded-lg border border-t-4 border-t-violet-500 overflow-hidden">
  <StudentActivityChart />
</div>
// NEW:
<ErrorBoundary>
  <StudentActivityChart />
</ErrorBoundary>

// Lines 98-103 — Coaches & Revenue section header:
// OLD (gradient lines):
<div className="flex items-center gap-3">
  <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent" />
  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
    Coaches & Revenue
  </h2>
  <div className="h-px flex-1 bg-gradient-to-l from-primary/20 via-accent/10 to-transparent" />
</div>
// NEW:
<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
  Coaches & Revenue
</h2>
```

**Step 2: Verify admin dashboard layout**

Expected: Section headers are clean uppercase text with wide tracking, no gradient lines. Charts render in standard cards without colored top borders.

**Step 3: Commit**

```bash
git add src/app/(protected)/admin/dashboard/page.tsx
git commit -m "feat: clean up admin dashboard — editorial section headers, remove chart accents"
```

---

## Task 8: Refine Student Dashboard Components

**Files:**
- Modify: `src/features/student/components/dashboard/NextLessonHero.tsx`
- Modify: `src/features/student/components/dashboard/StudentProgress.tsx`
- Modify: `src/app/(protected)/student/dashboard/page.tsx`

**Step 1: Refine NextLessonHero — softer gradient, cleaner layout**

```tsx
// NextLessonHero.tsx line 66 — card wrapper:
// OLD:
className="border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent overflow-hidden"
// NEW — subtler gradient:
className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden"

// Line 70 — icon container:
// OLD:
<div className="p-1.5 rounded-lg bg-primary/10">
// NEW:
<div className="p-2 rounded-xl bg-primary/10">
```

**Step 2: Refine StudentProgress — remove header gradient**

```tsx
// StudentProgress.tsx line 42 — card header:
// OLD:
<CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
// NEW:
<CardHeader className="pb-3">
```

**Step 3: Refine student dashboard page — remove Payment Info gradient header**

```tsx
// student/dashboard/page.tsx line 61 — Payment Info card header:
// OLD:
<CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-transparent">
// NEW:
<CardHeader className="pb-3">
```

**Step 4: Verify student dashboard**

Navigate to: http://localhost:3100/student/dashboard
Expected: Hero card has subtler gradient, progress card and payment card have clean white headers.

**Step 5: Commit**

```bash
git add src/features/student/components/dashboard/NextLessonHero.tsx src/features/student/components/dashboard/StudentProgress.tsx src/app/(protected)/student/dashboard/page.tsx
git commit -m "feat: refine student dashboard — subtler gradients, cleaner card headers"
```

---

## Task 9: Refine Coach Dashboard Page & Timeline Header

**Files:**
- Modify: `src/app/(protected)/coach/dashboard/page.tsx`
- Modify: `src/features/admin/components/dashboard/TodayTimeline.tsx`

**Step 1: Update coach dashboard section headers**

```tsx
// coach/dashboard/page.tsx lines 28-34 — Lessons section header:
// OLD (gradient lines):
<div className="flex items-center gap-3">
  <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent" />
  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
    Lessons
  </h2>
  <div className="h-px flex-1 bg-gradient-to-l from-primary/20 via-accent/10 to-transparent" />
</div>
// NEW:
<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
  Lessons
</h2>
```

**Step 2: Refine TodayTimeline — remove header gradient**

```tsx
// TodayTimeline.tsx line 91 — card header:
// OLD:
<CardHeader className="pb-2 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
// NEW:
<CardHeader className="pb-2">
```

**Step 3: Verify both dashboards**

Expected: Coach dashboard has clean section headers. TodayTimeline has clean white header.

**Step 4: Commit**

```bash
git add src/app/(protected)/coach/dashboard/page.tsx src/features/admin/components/dashboard/TodayTimeline.tsx
git commit -m "feat: refine coach dashboard and timeline — clean section headers"
```

---

## Task 10: Final Build Verification

**Step 1: Run type check**

Run: `pnpm type-check`
Expected: PASS with zero errors

**Step 2: Run build**

Run: `pnpm build`
Expected: Builds successfully

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No new lint errors

**Step 4: Visual verification checklist**

Open `pnpm dev` and check each dashboard:

- [ ] **Admin dashboard** (http://localhost:3100/admin/dashboard)
  - KPI cards: large numbers, no left borders, rounded-xl icon containers, hover lift
  - Activity feed: thin timeline line, spaced entries, small dots
  - Quick actions: rounded-xl cards, no icon scale on hover
  - Section headers: clean uppercase with wide tracking
  - Charts: no colored top borders
- [ ] **Student dashboard** (http://localhost:3100/student/dashboard)
  - Hero card: subtle gradient
  - Progress card: clean white header
  - Payment card: clean white header
- [ ] **Coach dashboard** (http://localhost:3100/coach/dashboard)
  - KPI cards: match admin design
  - Section headers: clean uppercase
- [ ] **Font**: Plus Jakarta Sans renders across all pages
- [ ] **Card shadows**: Multi-layer soft shadows on all cards
- [ ] **Mobile responsive**: Check at 375px width — no regressions

**Step 5: Commit any final fixes if needed**
