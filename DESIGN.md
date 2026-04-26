---
version: alpha
name: "YM Movement — Luxury Athletic"
description: "Elite ice dance coaching platform. Dark dramatic landing, light editorial dashboards, cyan accent system."

colors:
  primary: "#002444"
  primary-container: "#1a3a5c"
  secondary: "#0891b2"
  secondary-light: "#22d3ee"
  tertiary: "#7c3aed"
  surface: "#f7f9fb"
  surface-dim: "#f0f2f4"
  on-surface: "#191c1e"
  on-surface-muted: "#43474e"
  card: "#ffffff"
  error: "#dc2626"
  success: "#10b981"
  warning: "#f59e0b"
  border: "#c8ccd4"
  border-subtle: "#e4e6ea"
  muted: "#f0f2f4"
  muted-foreground: "#43474e"
  # Landing page dark palette
  navy-900: "#0f172a"
  navy-footer: "#1a3a5c"
  # Chart palette
  chart-cyan: "#0891b2"
  chart-violet: "#7c3aed"
  chart-emerald: "#10b981"
  chart-amber: "#f59e0b"
  chart-rose: "#f43f5e"
  # Calendar lesson type tints
  lesson-private: "#3b82f6"
  lesson-choreography: "#8b5cf6"
  lesson-group: "#10b981"
  lesson-competition: "#f97316"

typography:
  headline-display:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-section:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.15em
  label-kpi:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.15em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
  value-kpi:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em

rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  page-padding: 32px
  card-padding: 24px

components:
  # --- Buttons ---
  button-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "#ffffff"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "#15304d"
  button-cta:
    backgroundColor: "{colors.secondary}"
    textColor: "#ffffff"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 16px
  button-cta-hover:
    backgroundColor: "#0e7490"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary-container}"
    rounded: "{rounded.lg}"
    padding: 12px
  # --- Cards ---
  card-default:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 24px
  card-kpi:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 24px
  card-kpi-hover:
    backgroundColor: "{colors.card}"
  card-glassmorphism:
    backgroundColor: "#ffffff0d"
    rounded: "{rounded.xl}"
    padding: 32px
  # --- Inputs ---
  input-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 12px
  input-error:
    backgroundColor: "{colors.card}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
    padding: 12px
  # --- Icon containers ---
  icon-container:
    backgroundColor: "{colors.surface-dim}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.xl}"
    width: 48px
    height: 48px
  icon-container-lg:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xl}"
    width: 48px
    height: 48px
  # --- Section header ---
  section-header:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-section}"
  # --- Sidebar ---
  sidebar:
    backgroundColor: "{colors.navy-900}"
    textColor: "#ffffff"
    width: 256px
  sidebar-active:
    backgroundColor: "{colors.secondary-light}"
    textColor: "#ffffff"
  # --- Navigation ---
  nav-landing:
    backgroundColor: "#ffffffcc"
    textColor: "{colors.primary-container}"
    height: 80px
  nav-dashboard:
    backgroundColor: "#ffffffcc"
    textColor: "{colors.on-surface-muted}"
    height: 96px
  # --- Footer ---
  footer:
    backgroundColor: "{colors.navy-footer}"
    textColor: "#ffffff"
  # --- Alerts ---
  alert-success:
    backgroundColor: "{colors.success}"
    textColor: "#ffffff"
  alert-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-surface}"
  alert-error:
    backgroundColor: "{colors.error}"
    textColor: "#ffffff"
  # --- Charts ---
  chart-primary:
    backgroundColor: "{colors.chart-cyan}"
    textColor: "#ffffff"
  chart-secondary:
    backgroundColor: "{colors.chart-violet}"
    textColor: "#ffffff"
  chart-tertiary:
    backgroundColor: "{colors.chart-emerald}"
    textColor: "#ffffff"
  chart-quaternary:
    backgroundColor: "{colors.chart-amber}"
    textColor: "{colors.on-surface}"
  chart-quinary:
    backgroundColor: "{colors.chart-rose}"
    textColor: "#ffffff"
  # --- Calendar events ---
  calendar-private:
    backgroundColor: "{colors.lesson-private}"
    textColor: "#ffffff"
  calendar-choreography:
    backgroundColor: "{colors.lesson-choreography}"
    textColor: "#ffffff"
  calendar-group:
    backgroundColor: "{colors.lesson-group}"
    textColor: "#ffffff"
  calendar-competition:
    backgroundColor: "{colors.lesson-competition}"
    textColor: "#ffffff"
  # --- Skeleton loading ---
  skeleton:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.md}"
  # --- Cards with border ---
  card-bordered:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  card-bordered-subtle:
    backgroundColor: "{colors.card}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  # --- Badges ---
  badge-tertiary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
---

## Overview

YM Movement is an elite ice dance coaching platform founded by Olympic athlete Yura Min. The design language blends **luxury athletic** energy with **editorial precision** — a dramatic dark landing page that commands attention, transitioning to clean, spacious dashboards that respect the user's focus.

**Brand personality:** Confident, precise, premium, approachable. Think Olympic-level performance meets modern SaaS clarity.

**Target audience:** Competitive figure skaters (students), coaches, and parents managing training programs.

**Emotional response:** "This is serious, professional, and beautiful — I'm in good hands."

## Colors

The palette anchors on deep navy and cyan, evoking ice and precision.

- **Primary (`#002444`)** — Deep navy. Used for sidebar, primary buttons, and text headings.
- **Primary container (`#1a3a5c`)** — Lighter navy. Used for landing page footer, nav CTA button, sidebar background.
- **Secondary / Accent (`#0891b2`)** — Cyan-600. The signature accent color across charts, CTAs, active states, and hover highlights.
- **Secondary light (`#22d3ee`)** — Cyan-400. Used for hover states on dark backgrounds and the calendar now-indicator.
- **Tertiary (`#7c3aed`)** — Violet. Used as a secondary chart color and for choreography lesson type.
- **Surface (`#f7f9fb`)** — Near-white background for dashboard pages.
- **Card (`#ffffff`)** — Pure white card backgrounds.
- **Muted (`#f0f2f4`)** — Skeleton loading backgrounds, subtle fills, stat boxes.
- **Error (`#dc2626`)** — Destructive actions and error states.

**Semantic icon palette (pastel backgrounds + 600-level foregrounds):**

| Context | Background | Icon color |
|---------|-----------|------------|
| Cyan | `bg-cyan-50` | `text-cyan-600` |
| Blue | `bg-blue-50` | `text-blue-600` |
| Emerald | `bg-emerald-50` | `text-emerald-600` |
| Violet | `bg-violet-50` | `text-violet-600` |
| Amber | `bg-amber-50` | `text-amber-600` |

## Typography

Three font families serve distinct roles:

- **Space Grotesk** (`font-display`) — Display/hero headlines only. Bold, geometric, attention-grabbing.
- **Inter** (`font-sans`, `font-body`) — Everything else: headings, body text, labels, UI elements.
- **Public Sans** — Reserved for future use (Stitch system font).

**Key patterns:**
- **Page titles:** `text-2xl sm:text-3xl font-bold tracking-tight` — responsive sizing, inherits foreground color.
- **Section headers:** `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground` — editorial uppercase labels above card groups.
- **KPI values:** `text-3xl font-bold tracking-tight` — large, bold numbers.
- **KPI labels:** `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground` — matches section headers.

## Layout

- **Dashboard max width:** `max-w-[1800px] mx-auto` with `p-8` padding.
- **Sidebar:** Fixed `w-64` (256px), dark navy background, always visible on desktop.
- **Main content offset:** `lg:pl-64` to accommodate fixed sidebar.
- **Header height:** `h-24` (96px) for both sidebar header and main content header.
- **Landing page nav:** `h-20` (80px) with `backdrop-blur-md`.
- **Grid gaps:** `gap-6` standard, `gap-8` for landing page feature cards.
- **Container:** Centered with `2rem` padding, `1400px` max on 2xl screens.

## Elevation & Depth

Three shadow tiers create visual hierarchy:

1. **Resting cards:** `shadow-multi` — `0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)`. Subtle, sophisticated.
2. **Hover / interactive:** `shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)]` — deeper lift on hover.
3. **Landing glassmorphism:** `shadow-[0_8px_32px_rgba(0,0,0,0.2)]` — dramatic depth on dark backgrounds.
4. **CTA glow:** `shadow-[0_0_20px_rgba(8,145,178,0.4)]` — cyan glow behind CTA buttons.

**Backdrop blur:** `backdrop-blur-md` on landing nav, `backdrop-blur-xl` on dashboard header.

## Shapes

- **Cards:** `rounded-xl` (16px) — all cards, both dashboard and landing.
- **Buttons:** `rounded-lg` (12px) — all buttons.
- **Icon containers:** `rounded-xl` (16px) with `w-12 h-12` — consistent across all KPI/overview cards.
- **Badges/pills:** `rounded-full` — status badges and hero badges.
- **Inputs:** `rounded-md` (8px) — form inputs and selects.
- **Calendar events:** `rounded-lg` (8px) — event blocks in the calendar.

## Components

### KPI Cards
- White background, `shadow-multi` resting shadow
- Hover: `-translate-y-1` lift + deeper shadow
- Icon: `w-12 h-12 rounded-xl` with pastel-50 bg and 600-level color
- Icon animation: `group-hover:scale-110 transition-transform duration-200`
- Label: `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground`
- Value: `text-3xl font-bold tracking-tight`

### Feature Cards (Landing)
- Glassmorphism: `bg-white/5 backdrop-blur-lg border border-white/10`
- Hover: `-translate-y-2` lift
- Icon: `w-12 h-12 rounded-xl` with `{color}-500/20` bg and `{color}-400` text
- Dark shadow: `shadow-[0_8px_32px_rgba(0,0,0,0.2)]`

### Section Headers
- Pattern: uppercase label above a content group
- Style: `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground`
- On dark backgrounds: same pattern but `text-cyan-400`

### Skeleton Loading
- Background: `bg-muted` (never `bg-gray-200` or `bg-slate-200`)
- Animation: `animate-pulse`
- Shape: `rounded` for small elements, `rounded-lg` for large blocks

### Calendar Events
- Transparent tinted blocks by lesson type
- Active lessons: `0.30` bg opacity, `0.60` border opacity
- Available slots: `0.25` bg opacity, `0.55` border opacity
- Draft slots: `0.15` bg opacity, `0.40` border opacity

## Do's and Don'ts

**Do:**
- Use design tokens (`text-foreground`, `bg-muted`, `border-border`) instead of hardcoded Tailwind colors
- Use `text-muted-foreground` for secondary text, never `text-gray-500` or `text-slate-500`
- Use `border-border` for visible borders, `border-border/30` for subtle inner borders
- Keep the pastel-50 bg + 600-level icon color pattern for all icon containers
- Use `group` + `group-hover:scale-110` on icon containers inside interactive cards
- Maintain the `hover:-translate-y-1` + deeper shadow pattern for interactive cards
- Use responsive title sizing: `text-2xl sm:text-3xl`

**Don't:**
- Use hardcoded grays (`gray-200`, `gray-500`, `gray-900`, `slate-200`, `slate-500`)
- Use solid/opaque icon backgrounds (e.g., `bg-blue-500 text-white`) — always use pastel system
- Use `font-bold` on section headers — use `font-semibold`
- Add colored gradients to cards on the dashboard — keep cards white with subtle shadows
- Use `shadow-md`, `shadow-lg` directly — use the defined shadow system
- Mix indigo/blue accents into the cyan palette — stick to cyan-500/600 for the primary accent
- Forget `transition-all duration-200` on hoverable elements
