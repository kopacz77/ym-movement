# Storybook Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Storybook 9 globally with MSW-based TRPC mocking, dark mode toggle, and Playwright VRT — covering UI primitives and actively redesigned feature components.

**Architecture:** Storybook 9 with `@storybook/nextjs-vite` framework adapter, co-located stories alongside components, MSW intercepting TRPC HTTP requests for realistic data, and a separate Playwright config for visual regression testing against a built Storybook.

**Tech Stack:** Storybook 9, @storybook/nextjs-vite, MSW 2.x, msw-trpc, Playwright, Tailwind 3, React 19, Next.js 16

---

## Task 1: Install Storybook and Dependencies

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

**Step 1: Install Storybook packages**

```bash
pnpm add -D storybook @storybook/nextjs-vite @storybook/react @storybook/addon-essentials @storybook/addon-themes @storybook/addon-interactions @storybook/addon-a11y @storybook/test
```

**Step 2: Add scripts to package.json**

Add these to the `"scripts"` section in `package.json`:

```json
"storybook": "storybook dev -p 6006",
"storybook:build": "storybook build -o storybook-static"
```

**Step 3: Add storybook-static to .gitignore**

Append to `.gitignore`:

```
# Storybook
storybook-static/
```

**Step 4: Verify installation**

```bash
pnpm storybook --smoke-test
```

Expected: Storybook starts and exits cleanly (or prints a success message). If `--smoke-test` is not available, just verify `pnpm storybook` starts on port 6006 and kill it.

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "feat: install Storybook 9 with nextjs-vite adapter and addons"
```

---

## Task 2: Create Storybook Configuration

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.ts`
- Create: `.storybook/preview-head.html`

**Step 1: Create `.storybook/main.ts`**

```ts
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-themes",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

**Step 2: Create `.storybook/preview.ts`**

```ts
import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";

import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
  decorators: [
    // Dark mode toggle — matches Tailwind's darkMode: "class" config
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    // Font variables decorator — next/font doesn't run in Storybook
    (Story) => (
      <div style={{ fontFamily: "'Public Sans', 'Inter', system-ui, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

**Step 3: Create `.storybook/preview-head.html`**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
<style>
  :root {
    --font-sans: "Public Sans", system-ui, sans-serif;
    --font-body: "Inter", system-ui, sans-serif;
  }
</style>
```

**Step 4: Verify Storybook starts**

```bash
pnpm storybook
```

Expected: Storybook dev server starts on `http://localhost:6006` with no stories found (expected — we haven't written any yet). Verify the page loads, then stop the server.

**Step 5: Commit**

```bash
git add .storybook/
git commit -m "feat: configure Storybook with Tailwind, dark mode, and font setup"
```

---

## Task 3: Create MSW Handlers for TRPC Mocking

**Files:**
- Create: `src/test/msw/fixtures/admin.ts`
- Create: `src/test/msw/fixtures/scheduling.ts`
- Create: `src/test/msw/handlers.ts`
- Create: `src/test/msw/browser.ts`

**Step 1: Create admin fixture data**

File: `src/test/msw/fixtures/admin.ts`

```ts
// Admin dashboard fixture data for Storybook stories
export const adminOverview = {
  activeLessons: 6,
  monthlyRevenue: 4850,
  totalStudents: 12,
  pendingPayments: 3,
};

export const revenueReportData = [
  { date: "2026-04-01", revenue: 240 },
  { date: "2026-04-03", revenue: 360 },
  { date: "2026-04-05", revenue: 120 },
  { date: "2026-04-07", revenue: 480 },
  { date: "2026-04-09", revenue: 240 },
  { date: "2026-04-11", revenue: 360 },
  { date: "2026-04-13", revenue: 120 },
  { date: "2026-04-15", revenue: 600 },
  { date: "2026-04-17", revenue: 240 },
  { date: "2026-04-19", revenue: 480 },
  { date: "2026-04-21", revenue: 360 },
  { date: "2026-04-23", revenue: 240 },
];

export const revenueBreakdown = {
  byType: [
    { type: "PRIVATE", revenue: 2400, count: 20 },
    { type: "CHOREOGRAPHY", revenue: 1200, count: 8 },
    { type: "GROUP", revenue: 800, count: 10 },
    { type: "COMPETITION_PREP", revenue: 450, count: 3 },
  ],
};

export const studentActivity = [
  { month: "Jan", active: 8, new: 2, churned: 1 },
  { month: "Feb", active: 9, new: 3, churned: 2 },
  { month: "Mar", active: 10, new: 2, churned: 1 },
  { month: "Apr", active: 12, new: 3, churned: 1 },
];

export const activityFeedItems = [
  {
    id: "1",
    type: "LESSON_BOOKED",
    message: "Sarah Chen booked a Private lesson",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "2",
    type: "PAYMENT_RECEIVED",
    message: "Payment of $120 received from Alex Kim",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "3",
    type: "STUDENT_APPROVED",
    message: "New student Maria Lopez approved",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "4",
    type: "LESSON_CANCELLED",
    message: "Jake Wilson cancelled tomorrow's lesson",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];
```

**Step 2: Create scheduling fixture data**

File: `src/test/msw/fixtures/scheduling.ts`

```ts
// Scheduling fixture data for Storybook stories

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

export const todayTimeSlots = [
  {
    id: "slot-1",
    startTime: `${todayStr}T14:00:00.000Z`,
    endTime: `${todayStr}T15:00:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-1",
        type: "PRIVATE",
        price: 120,
        status: "CONFIRMED",
        notes: null,
        Student: { id: "s1", User: { name: "Sarah Chen" } },
      },
    ],
  },
  {
    id: "slot-2",
    startTime: `${todayStr}T15:30:00.000Z`,
    endTime: `${todayStr}T16:30:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-2",
        type: "CHOREOGRAPHY",
        price: 150,
        status: "CONFIRMED",
        notes: "Working on free skate program",
        Student: { id: "s2", User: { name: "Alex Kim" } },
      },
    ],
  },
  {
    id: "slot-3",
    startTime: `${todayStr}T17:00:00.000Z`,
    endTime: `${todayStr}T18:00:00.000Z`,
    maxStudents: 3,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-3",
        type: "GROUP",
        price: 60,
        status: "CONFIRMED",
        notes: null,
        Student: { id: "s3", User: { name: "Maria Lopez" } },
      },
    ],
  },
  {
    id: "slot-4",
    startTime: `${todayStr}T19:00:00.000Z`,
    endTime: `${todayStr}T20:00:00.000Z`,
    maxStudents: 1,
    isActive: true,
    rinkId: "rink-1",
    Lesson: [
      {
        id: "lesson-4",
        type: "COMPETITION_PREP",
        price: 180,
        status: "CONFIRMED",
        notes: "Regional competition prep",
        Student: { id: "s4", User: { name: "Jake Wilson" } },
      },
    ],
  },
];

export const emptyTimeSlots: typeof todayTimeSlots = [];
```

**Step 3: Create MSW handlers**

File: `src/test/msw/handlers.ts`

```ts
import { http, HttpResponse } from "msw";
import {
  adminOverview,
  revenueReportData,
  revenueBreakdown,
  studentActivity,
  activityFeedItems,
} from "./fixtures/admin";
import { todayTimeSlots } from "./fixtures/scheduling";

// TRPC uses batched HTTP requests to /api/trpc/<procedure>
// MSW intercepts these at the HTTP level

function trpcQuery(procedure: string, data: unknown) {
  return http.get(`*/api/trpc/${procedure}`, () => {
    return HttpResponse.json([{ result: { data } }]);
  });
}

function trpcBatchQuery(procedure: string, data: unknown) {
  return http.get(new RegExp(`/api/trpc/.*${procedure.replace(/\./g, "\\.")}`), () => {
    return HttpResponse.json([{ result: { data } }]);
  });
}

export const adminHandlers = [
  trpcQuery("admin.analytics.getOverview", adminOverview),
  trpcQuery("admin.analytics.getRevenueReport", revenueReportData),
  trpcQuery("admin.analytics.getRevenueBreakdown", revenueBreakdown),
  trpcQuery("admin.analytics.getStudentActivity", studentActivity),
  trpcQuery("admin.schedule.getTimeSlots", todayTimeSlots),
];

export const handlers = [...adminHandlers];
```

**Step 4: Create MSW browser worker initialization**

File: `src/test/msw/browser.ts`

```ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

**Step 5: Commit**

```bash
git add src/test/msw/
git commit -m "feat: add MSW fixtures and handlers for Storybook TRPC mocking"
```

---

## Task 4: Wire MSW into Storybook Preview

**Files:**
- Modify: `.storybook/preview.ts`
- Create: `public/mockServiceWorker.js`

**Step 1: Generate the MSW service worker file**

```bash
pnpm dlx msw init public/ --save
```

Expected: Creates `public/mockServiceWorker.js`. This file is served by Storybook's static dir.

**Step 2: Update `.storybook/preview.ts` to initialize MSW**

Replace the contents of `.storybook/preview.ts` with:

```ts
import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import { initialize, mswLoader } from "msw-storybook-addon";

import "../src/styles/globals.css";

// Initialize MSW — must be called before any story renders
initialize({
  onUnhandledRequest: "bypass",
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
  loaders: [mswLoader],
  decorators: [
    // Dark mode toggle — matches Tailwind's darkMode: "class" config
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    // Font variables decorator — next/font doesn't run in Storybook
    (Story) => (
      <div style={{ fontFamily: "'Public Sans', 'Inter', system-ui, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

**Step 3: Install msw-storybook-addon**

```bash
pnpm add -D msw-storybook-addon
```

**Step 4: Verify MSW initializes in Storybook**

```bash
pnpm storybook
```

Expected: Storybook starts. Open browser console — you should see `[MSW] Mocking enabled.` message. No stories yet is fine.

**Step 5: Commit**

```bash
git add .storybook/preview.ts public/mockServiceWorker.js package.json pnpm-lock.yaml
git commit -m "feat: wire MSW service worker into Storybook preview"
```

---

## Task 5: Create Storybook TRPC Provider Decorator

**Files:**
- Create: `.storybook/decorators/TRPCDecorator.tsx`
- Modify: `.storybook/preview.ts`

**Step 1: Create the TRPC provider decorator**

File: `.storybook/decorators/TRPCDecorator.tsx`

This wraps stories in the same TRPC + QueryClient providers the app uses, so `api.*.useQuery()` hooks work inside stories (with MSW intercepting the actual HTTP requests).

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import superjson from "superjson";
import { api } from "../../src/lib/api";

export function TRPCDecorator({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}
```

**Step 2: Add the TRPC decorator to `.storybook/preview.ts`**

Update the decorators array in `.storybook/preview.ts` to include the TRPC decorator. Add this import at the top:

```ts
import { TRPCDecorator } from "./decorators/TRPCDecorator";
```

Then update the `decorators` array — add the TRPC decorator as the outermost wrapper:

```ts
  decorators: [
    // TRPC + QueryClient provider — enables api.*.useQuery() in stories
    (Story) => (
      <TRPCDecorator>
        <Story />
      </TRPCDecorator>
    ),
    // Dark mode toggle
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    // Font variables
    (Story) => (
      <div style={{ fontFamily: "'Public Sans', 'Inter', system-ui, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
```

**Step 3: Commit**

```bash
git add .storybook/decorators/ .storybook/preview.ts
git commit -m "feat: add TRPC provider decorator for Storybook stories"
```

---

## Task 6: Wave 1 Stories — Button Component

**Files:**
- Create: `src/components/ui/button.stories.tsx`

**Step 1: Write Button stories**

File: `src/components/ui/button.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Plus, Loader2 } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Button" },
};

export const Destructive: Story = {
  args: { children: "Delete", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Outline", variant: "outline" },
};

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
};

export const Ghost: Story = {
  args: { children: "Ghost", variant: "ghost" },
};

export const Link: Story = {
  args: { children: "Link", variant: "link" },
};

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large", size: "lg" },
};

export const WithIcon: Story = {
  args: { children: <><Mail /> Send Email</> },
};

export const IconOnly: Story = {
  args: { children: <Plus />, size: "icon" },
};

export const Loading: Story = {
  args: {
    children: <><Loader2 className="animate-spin" /> Please wait</>,
    disabled: true,
  },
};

export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus /></Button>
    </div>
  ),
};
```

**Step 2: Verify in Storybook**

```bash
pnpm storybook
```

Expected: Navigate to `UI/Button` in sidebar. All stories render with correct Tailwind styling, dark mode toggle works.

**Step 3: Commit**

```bash
git add src/components/ui/button.stories.tsx
git commit -m "feat: add Button component stories with all variants and sizes"
```

---

## Task 7: Wave 1 Stories — Card Component

**Files:**
- Create: `src/components/ui/card.stories.tsx`

**Step 1: Write Card stories**

File: `src/components/ui/card.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area. It supports any content.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
        <CardDescription>Monthly overview</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">View All</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">$4,850</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>Are you sure you want to proceed?</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
  ),
};

export const LoadingSkeleton: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="p-6">
        <div className="h-20 animate-pulse bg-muted rounded" />
      </CardContent>
    </Card>
  ),
};

export const KPICard: Story = {
  name: "KPI Card (Dashboard Style)",
  render: () => (
    <Card className="w-[280px] group hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Revenue This Month
            </p>
            <p className="text-3xl font-bold tracking-tight text-primary">$4,850</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <span className="text-emerald-600 text-lg">$</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};
```

**Step 2: Verify in Storybook**

Expected: Card stories render with `shadow-multi`, border styling, and proper spacing.

**Step 3: Commit**

```bash
git add src/components/ui/card.stories.tsx
git commit -m "feat: add Card component stories including KPI dashboard style"
```

---

## Task 8: Wave 1 Stories — Badge Component

**Files:**
- Create: `src/components/ui/badge.stories.tsx`

**Step 1: Write Badge stories**

File: `src/components/ui/badge.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Badge" },
};

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
};

export const Destructive: Story = {
  args: { children: "Destructive", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Outline", variant: "outline" },
};

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large", size: "lg" },
};

export const LessonTypes: Story = {
  name: "Lesson Type Badges",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Private</Badge>
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">Choreography</Badge>
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Group</Badge>
      <Badge className="bg-orange-100 text-orange-800 border-orange-200">Competition Prep</Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};
```

**Step 2: Commit**

```bash
git add src/components/ui/badge.stories.tsx
git commit -m "feat: add Badge component stories with lesson type variants"
```

---

## Task 9: Wave 1 Stories — Input, Select, Skeleton

**Files:**
- Create: `src/components/ui/input.stories.tsx`
- Create: `src/components/ui/skeleton.stories.tsx`

**Step 1: Write Input stories**

File: `src/components/ui/input.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Search } from "lucide-react";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Enter text..." },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="student@example.com" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: "Disabled input", disabled: true },
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email-err">Email</Label>
      <Input type="email" id="email-err" placeholder="Email" aria-invalid="true" className="border-destructive" />
      <p className="text-sm text-destructive">Please enter a valid email address</p>
    </div>
  ),
};
```

**Step 2: Write Skeleton stories**

File: `src/components/ui/skeleton.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: "h-4 w-[250px]" },
};

export const Circle: Story = {
  args: { className: "h-12 w-12 rounded-full" },
};

export const CardSkeleton: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <Skeleton className="h-5 w-[180px]" />
        <Skeleton className="h-4 w-[250px]" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </CardContent>
    </Card>
  ),
};

export const KPICardSkeleton: Story = {
  name: "KPI Card Loading",
  render: () => (
    <div className="grid grid-cols-2 gap-6 w-[600px]">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-20 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
```

**Step 3: Commit**

```bash
git add src/components/ui/input.stories.tsx src/components/ui/skeleton.stories.tsx
git commit -m "feat: add Input and Skeleton component stories"
```

---

## Task 10: Wave 2 Stories — SmartKPICards (Feature Component)

**Files:**
- Create: `src/features/admin/components/dashboard/SmartKPICards.stories.tsx`

**Step 1: Write SmartKPICards stories**

This component uses `api.admin.analytics.getOverview.useQuery()`. MSW intercepts the TRPC HTTP request and returns fixture data.

File: `src/features/admin/components/dashboard/SmartKPICards.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { SmartKPICards } from "./SmartKPICards";

const meta = {
  title: "Admin/Dashboard/SmartKPICards",
  component: SmartKPICards,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SmartKPICards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                activeLessons: 6,
                monthlyRevenue: 4850,
                totalStudents: 12,
                pendingPayments: 3,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const HighVolume: Story = {
  name: "High Volume Day",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                activeLessons: 14,
                monthlyRevenue: 12400,
                totalStudents: 28,
                pendingPayments: 7,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const Empty: Story = {
  name: "No Data",
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([{
            result: {
              data: {
                activeLessons: 0,
                monthlyRevenue: 0,
                totalStudents: 0,
                pendingPayments: 0,
              },
            },
          }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", async () => {
          // Never resolves — component stays in loading state
          await new Promise(() => {});
        }),
      ],
    },
  },
};
```

**Step 2: Verify in Storybook**

```bash
pnpm storybook
```

Expected: Navigate to `Admin/Dashboard/SmartKPICards`. The "Default" story shows 4 KPI cards with realistic data. "Loading" shows skeleton placeholders. "No Data" shows all zeros.

**Step 3: Commit**

```bash
git add src/features/admin/components/dashboard/SmartKPICards.stories.tsx
git commit -m "feat: add SmartKPICards stories with MSW-mocked TRPC data"
```

---

## Task 11: Wave 2 Stories — TodayTimeline

**Files:**
- Create: `src/features/admin/components/dashboard/TodayTimeline.stories.tsx`

**Step 1: Write TodayTimeline stories**

File: `src/features/admin/components/dashboard/TodayTimeline.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { TodayTimeline } from "./TodayTimeline";
import { todayTimeSlots, emptyTimeSlots } from "@/test/msw/fixtures/scheduling";

const meta = {
  title: "Admin/Dashboard/TodayTimeline",
  component: TodayTimeline,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TodayTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLessons: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.schedule.getTimeSlots*", () => {
          return HttpResponse.json([{ result: { data: todayTimeSlots } }]);
        }),
      ],
    },
  },
};

export const EmptyDay: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.schedule.getTimeSlots*", () => {
          return HttpResponse.json([{ result: { data: emptyTimeSlots } }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.schedule.getTimeSlots*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
```

**Step 2: Commit**

```bash
git add src/features/admin/components/dashboard/TodayTimeline.stories.tsx
git commit -m "feat: add TodayTimeline stories with lesson type color variants"
```

---

## Task 12: Wave 2 Stories — RevenueChart

**Files:**
- Create: `src/features/admin/components/analytics/RevenueChart.stories.tsx`

**Step 1: Write RevenueChart stories**

File: `src/features/admin/components/analytics/RevenueChart.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { RevenueChart } from "./RevenueChart";
import { revenueReportData } from "@/test/msw/fixtures/admin";

const meta = {
  title: "Admin/Analytics/RevenueChart",
  component: RevenueChart,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RevenueChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", () => {
          return HttpResponse.json([{ result: { data: revenueReportData } }]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", () => {
          return HttpResponse.json(
            [{ error: { message: "Failed to fetch revenue data", code: "INTERNAL_SERVER_ERROR" } }],
            { status: 500 },
          );
        }),
      ],
    },
  },
};

export const EmptyData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getRevenueReport*", () => {
          return HttpResponse.json([{ result: { data: [] } }]);
        }),
      ],
    },
  },
};
```

**Step 2: Commit**

```bash
git add src/features/admin/components/analytics/RevenueChart.stories.tsx
git commit -m "feat: add RevenueChart stories with loaded, loading, error, and empty states"
```

---

## Task 13: Wave 2 Stories — Remaining Dashboard Components

**Files:**
- Create: `src/features/admin/components/dashboard/QuickActions.stories.tsx`
- Create: `src/features/admin/components/dashboard/ActivityFeed.stories.tsx`

**Step 1: Read QuickActions and ActivityFeed source**

Read `src/features/admin/components/dashboard/QuickActions.tsx` and `src/features/admin/components/dashboard/ActivityFeed.tsx` to understand their data dependencies and props. Then write stories matching their actual interface.

**Step 2: Write QuickActions stories**

File: `src/features/admin/components/dashboard/QuickActions.stories.tsx`

Write stories for the QuickActions component. This component likely has no data dependencies (it's a grid of action links). Create a `Default` story and a wrapper at `max-w-lg` width.

**Step 3: Write ActivityFeed stories**

File: `src/features/admin/components/dashboard/ActivityFeed.stories.tsx`

Write stories for the ActivityFeed component. If it fetches from TRPC, add MSW handlers using `activityFeedItems` fixture. Include: `Default`, `Empty`, `Loading` stories.

**Step 4: Commit**

```bash
git add src/features/admin/components/dashboard/QuickActions.stories.tsx src/features/admin/components/dashboard/ActivityFeed.stories.tsx
git commit -m "feat: add QuickActions and ActivityFeed stories"
```

---

## Task 14: Wave 2 Stories — Chart Components

**Files:**
- Create: `src/features/admin/components/analytics/StudentActivityChart.stories.tsx`
- Create: `src/features/admin/components/analytics/RevenueBreakdownChart.stories.tsx`

**Step 1: Read the chart components**

Read `src/features/admin/components/analytics/StudentActivityChart.tsx` and `src/features/admin/components/analytics/RevenueBreakdownChart.tsx` to understand their TRPC queries and data shapes.

**Step 2: Write stories for each chart**

Follow the same pattern as RevenueChart stories:
- MSW handler returning fixture data for Default
- Loading story (never-resolving handler)
- Error story (500 response)
- Wrap in `max-w-4xl` container

**Step 3: Commit**

```bash
git add src/features/admin/components/analytics/StudentActivityChart.stories.tsx src/features/admin/components/analytics/RevenueBreakdownChart.stories.tsx
git commit -m "feat: add StudentActivityChart and RevenueBreakdownChart stories"
```

---

## Task 15: Wave 2 Stories — Coach Dashboard Components

**Files:**
- Create: `src/features/coach/components/dashboard/CoachOverviewCards.stories.tsx`
- Create: `src/features/coach/components/dashboard/CoachUpcomingLessons.stories.tsx`
- Create: `src/features/coach/components/dashboard/CoachPastLessons.stories.tsx`

**Step 1: Read the coach dashboard components**

Read all three files to understand their TRPC queries and data shapes.

**Step 2: Write stories for each**

For each component, create stories with:
- `Default` — MSW returning realistic fixture data
- `Empty` — empty arrays
- `Loading` — never-resolving handlers

**Step 3: Commit**

```bash
git add src/features/coach/components/dashboard/
git commit -m "feat: add Coach dashboard component stories"
```

---

## Task 16: Wave 2 Stories — Student Dashboard Components

**Files:**
- Create: `src/features/student/components/dashboard/StudentProgress.stories.tsx`
- Create: `src/features/student/components/dashboard/UpcomingLessons.stories.tsx`

**Step 1: Read the student dashboard components**

Read both files to understand their TRPC queries and data shapes.

**Step 2: Write stories for each**

Follow same pattern: Default, Empty, Loading variants with MSW handlers.

**Step 3: Commit**

```bash
git add src/features/student/components/dashboard/
git commit -m "feat: add Student dashboard component stories"
```

---

## Task 17: Wave 2 Stories — FCEventContent (Calendar)

**Files:**
- Create: `src/features/scheduling/components/calendar/FCEventContent.stories.tsx`

**Step 1: Read FCEventContent source**

Read `src/features/scheduling/components/calendar/FCEventContent.tsx` to understand its props. This is a pure rendering component (receives event data as props from FullCalendar), so it likely doesn't need MSW.

**Step 2: Write stories**

Create stories showing different lesson types with their color-coded rendering:
- `PrivateLesson` — blue styling
- `ChoreographyLesson` — purple styling
- `GroupLesson` — green styling
- `CompetitionPrep` — orange styling
- `DraftSlot` — draft/unpublished styling

**Step 3: Commit**

```bash
git add src/features/scheduling/components/calendar/FCEventContent.stories.tsx
git commit -m "feat: add FCEventContent stories for all lesson type color variants"
```

---

## Task 18: Playwright VRT Configuration

**Files:**
- Create: `playwright-storybook.config.ts`
- Create: `tests/storybook-vrt.spec.ts`
- Modify: `package.json` (add `test:vrt` script)

**Step 1: Create the Playwright VRT config**

File: `playwright-storybook.config.ts`

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "storybook-vrt.spec.ts",
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: "html",
  use: {
    baseURL: "http://localhost:6006",
    screenshot: "off",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  webServer: {
    command: "pnpm dlx http-server storybook-static --port 6006 --silent",
    url: "http://localhost:6006",
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
```

**Step 2: Create the VRT test file**

File: `tests/storybook-vrt.spec.ts`

```ts
import { test, expect } from "@playwright/test";

// Story IDs to screenshot — add more as you create stories
const stories = [
  "ui-button--all-variants",
  "ui-button--all-sizes",
  "ui-card--default",
  "ui-card--kpi-card",
  "ui-badge--all-variants",
  "ui-badge--lesson-types",
  "ui-skeleton--card-skeleton",
  "admin-dashboard-smartkpicards--default",
  "admin-dashboard-todaytimeline--with-lessons",
  "admin-analytics-revenuechart--default",
];

for (const storyId of stories) {
  test(`VRT: ${storyId}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    // Wait for story to render
    await page.waitForLoadState("networkidle");
    // Extra wait for animations/charts
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${storyId}.png`);
  });
}
```

**Step 3: Add the VRT script to package.json**

Add to `"scripts"`:

```json
"test:vrt": "pnpm storybook:build && playwright test --config playwright-storybook.config.ts"
```

**Step 4: Run VRT to generate baselines**

```bash
pnpm storybook:build
pnpm dlx http-server storybook-static --port 6006 &
pnpm playwright test --config playwright-storybook.config.ts --update-snapshots
kill %1
```

Expected: Baseline screenshots generated in `tests/storybook-vrt.spec.ts-snapshots/`.

**Step 5: Commit**

```bash
git add playwright-storybook.config.ts tests/storybook-vrt.spec.ts package.json pnpm-lock.yaml tests/storybook-vrt.spec.ts-snapshots/
git commit -m "feat: add Playwright VRT for Storybook visual regression testing"
```

---

## Task 19: Final Verification and Cleanup

**Step 1: Full Storybook build test**

```bash
pnpm storybook:build
```

Expected: Builds without errors to `storybook-static/`.

**Step 2: Run VRT suite**

```bash
pnpm test:vrt
```

Expected: All screenshot comparisons pass against baselines.

**Step 3: Verify type checking still passes**

```bash
pnpm type-check
```

Expected: No new type errors introduced.

**Step 4: Verify main build isn't affected**

```bash
pnpm build
```

Expected: Next.js build succeeds — story files are not included in the app bundle.

**Step 5: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: finalize Storybook integration and verify build"
```
