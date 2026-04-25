# Storybook Integration Design

**Date:** 2026-04-24
**Status:** Approved
**Branch:** `frontend-design-improvements`

## Goals

1. **Component documentation** — living design system catalog for all UI primitives and feature components
2. **Interaction testing** — Storybook play functions for UI states expensive to set up in Playwright
3. **Visual regression testing** — Playwright VRT against built Storybook, evaluate Chromatic later
4. **Dark mode preview** — toggle light/dark for every story via `@storybook/addon-themes`

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storybook version | **9.x** | Full React 19 + Next.js 16 support, half the install size of v8 |
| Framework adapter | **`@storybook/nextjs-vite`** | Faster than Webpack, Vitest integration, Storybook Test support |
| Story location | **Co-located** (`Component.stories.tsx` next to `Component.tsx`) | Easier maintenance, discoverable |
| Data mocking | **MSW handlers** | `msw@^2.12.4` + `msw-trpc` already installed, reusable in Vitest |
| Visual regression | **Playwright VRT** | Free, uses existing Playwright setup, no SaaS dependency |
| Dark mode | **`@storybook/addon-themes`** with `withThemeByClassName` | Matches existing `darkMode: "class"` Tailwind config |

## Packages

### New Dependencies (devDependencies)

| Package | Purpose |
|---|---|
| `storybook` | Core CLI and dev server |
| `@storybook/nextjs-vite` | Next.js + Vite framework adapter |
| `@storybook/react` | React renderer |
| `@storybook/addon-essentials` | Docs, controls, actions, viewport |
| `@storybook/addon-themes` | Dark mode toggle |
| `@storybook/addon-interactions` | Play function testing UI |
| `@storybook/addon-a11y` | Accessibility checks panel |
| `@storybook/test` | Testing utilities (expect, userEvent, fn) |

### Already Installed (reused)

- `msw@^2.12.4` — request interception
- `msw-trpc` — typed TRPC mock handlers
- `@playwright/test@^1.57.0` — VRT runner
- `vitest@^3.2.4` — potential Storybook test runner integration

## Configuration

### `.storybook/main.ts`

- Framework: `@storybook/nextjs-vite`
- Story glob: `../src/**/*.stories.@(ts|tsx)`
- Addons: essentials, themes, interactions, a11y
- Static dirs: `../public` (for images/assets)

### `.storybook/preview.ts`

- Import `../src/styles/globals.css` (Tailwind + CSS custom properties)
- Dark mode: `withThemeByClassName` decorator toggling `.dark` class
- Font decorator: applies `--font-sans` CSS variable (next/font doesn't run in Storybook)
- TanStack QueryClient provider wrapper
- MSW initialization via `initialize()` from `msw/browser`

### `.storybook/preview-head.html`

- Google Fonts preload for Geist (fallback since next/font is unavailable)

## Data Mocking Strategy

MSW handlers organized per TRPC router:

```
src/test/msw/
  handlers.ts          — aggregated handler array
  fixtures/
    admin.ts           — admin dashboard fixture data
    student.ts         — student fixture data
    coach.ts           — coach fixture data
    scheduling.ts      — calendar/timeslot fixtures
```

- Handlers return realistic fixture data matching Prisma types
- Shared between Storybook stories and Vitest unit tests
- TRPC routes mocked at the HTTP level (MSW intercepts fetch)

## Story Priority

### Wave 1: UI Primitives (foundation)

| Component | Key States |
|---|---|
| `Button` | 6 variants x 4 sizes, disabled, loading |
| `Card` | with/without header actions, loading skeleton |
| `Badge` | all color variants, lesson type badges |
| `Dialog` / `ResponsiveDialog` | open states, mobile vs desktop |
| `Input`, `Select`, `Textarea` | default, focus, error, disabled |
| `Skeleton` / `LoadingSkeleton` | various shapes |
| `DataState` / `EncouragingEmptyState` | empty, error, loading states |
| `Spinner` | sizes |
| `Tabs` | default, with content |

### Wave 2: Actively Redesigned Components (immediate value)

| Component | Key States |
|---|---|
| `SmartKPICards` | loaded data, loading skeleton |
| `TodayTimeline` | with events, empty day |
| `RevenueChart` | with data, loading |
| `RevenueBreakdownChart` | with data, loading |
| `StudentActivityChart` | with data, loading |
| `QuickActions` | default grid |
| `ActivityFeed` | with items, empty |
| `CoachOverviewCards` | loaded, loading |
| `CoachUpcomingLessons` | with lessons, empty |
| `CoachPastLessons` | with lessons, empty |
| `StudentProgress` | with data, loading |
| `UpcomingLessons` (student) | with lessons, empty |
| `FCEventContent` | different lesson types, colors |

## Visual Regression Testing

- Separate Playwright config: `playwright-storybook.config.ts`
- Test file: `e2e/storybook-vrt.spec.ts`
- Workflow: `storybook:build` -> serve static -> Playwright screenshots
- Baselines stored in `e2e/storybook-vrt.spec.ts-snapshots/`
- Separate from main E2E suite (no Next.js server needed)

## Scripts (package.json)

```json
{
  "storybook": "storybook dev -p 6006",
  "storybook:build": "storybook build -o storybook-static",
  "test:vrt": "playwright test --config playwright-storybook.config.ts"
}
```

## File Structure

```
.storybook/
  main.ts
  preview.ts
  preview-head.html
src/
  components/ui/
    button.tsx
    button.stories.tsx           <- co-located
    card.tsx
    card.stories.tsx             <- co-located
  features/admin/components/dashboard/
    SmartKPICards.tsx
    SmartKPICards.stories.tsx     <- co-located
  test/
    msw/
      handlers.ts                <- shared MSW handlers
      fixtures/
        admin.ts
        student.ts
        coach.ts
        scheduling.ts
e2e/
  storybook-vrt.spec.ts         <- Playwright VRT
playwright-storybook.config.ts  <- separate Playwright config for VRT
storybook-static/               <- .gitignored
```

## .gitignore Additions

```
storybook-static/
```
