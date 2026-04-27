# Luxury Athletic UI Redesign — Design Document

**Date:** 2026-04-24
**Status:** Approved
**Branch:** `frontend-design-improvements`
**Reference:** `docs/stitch-designs/02-admin-dashboard.html`, `docs/stitch-designs/06-admin-calendar.html`

## Design Direction

"Luxury Athletic" — Navy (#1a3a5c), Cyan (#0891b2), Violet (#7c3aed). The aesthetic is "Nike Training Club meets Equinox" — premium, athletic, authoritative.

## Design System Tokens (from Stitch mockups)

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary Container | `#1a3a5c` (dark navy) | Sidebar bg, headings, KPI values |
| Secondary | `#006780` / `#0891b2` (cyan) | Active indicators, links, CTA glow |
| Tertiary | `#4900a2` / `#7c3aed` (violet) | Premium accents, badges |
| Surface | `#f7f9fb` | Page background |
| Surface Lowest | `#ffffff` | Card backgrounds |
| On Surface | `#191c1e` | Body text |
| On Surface Variant | `#43474e` | Secondary text |
| Outline | `#73777f` | Muted text (time labels) |
| Outline Variant | `#c3c6cf` | Borders (at 30% opacity) |

### Typography
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headlines | Public Sans | 700-900 | Page titles, KPI values, nav labels |
| Body | Inter | 400-600 | Body text, descriptions |
| Labels | Public Sans | 600-700 | Section headers, KPI labels (uppercase, tracking-[0.15em]) |
| Display (accent) | DM Sans | 700 | Dashboard title |

### Shadows
- Cards: `box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)` (`.shadow-multi`)
- Header: `shadow-sm`
- Sidebar: `shadow-2xl shadow-black/50`

### Sidebar Design (from mockup)
- Background: `bg-slate-900` (dark navy, NOT white)
- Text: `text-white/60` inactive, `text-white` active
- Active indicator: `border-l-[3px] border-cyan-500 bg-white/10`
- Logo area: Logo image + "YM Movement" in white + "Elite Coaching Platform" subtitle
- Bottom CTA: Gradient `from-cyan-600 to-teal-500` button
- Border: `border-white/10`

### Header Design (from mockup)
- Background: `bg-white/80 backdrop-blur-xl`
- Border: `border-b border-slate-200`
- Search input in header
- Notifications + profile avatar on right

### KPI Cards (from mockup)
- White bg (`surface-container-lowest`), subtle border `border-outline-variant/30`
- Shadow: `.shadow-multi`
- Hover: `-translate-y-1` lift
- Label: `text-xs uppercase tracking-[0.15em] text-on-surface-variant`
- Value: `text-3xl font-headline font-bold tracking-tight text-primary-container`
- Icon: `w-12 h-12 rounded-xl` colored bg with icon inside
- Icon colors: cyan-50/cyan, emerald-50/emerald, violet-50/violet, amber-50/amber

### Calendar Design (from mockup)
- Dark sidebar with Schedule active (cyan border-l)
- White calendar card with rounded-xl, shadow-multi
- Time column: 6am-9pm, `text-xs text-outline`
- Day headers: uppercase, small label font
- Current time: `bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]` glow line
- Event blocks: `rounded-lg`, pastel bg at 10% opacity, colored border at 30%
- Draft slots: `border-dashed` variant
- Color coding: Blue=Private, Purple=Choreo, Green=Group, Orange=Comp Prep

## What Changes

### 1. Sidebar (MAJOR — white → dark navy)
The current white sidebar with blue-50 active state becomes a dark slate-900 sidebar with cyan active indicators. This is the single biggest visual change.

### 2. Header (MODERATE — gradient → frosted glass)
Current `from-slate-50 via-blue-50 to-indigo-50` gradient becomes `bg-white/80 backdrop-blur-xl`. Cleaner, more modern.

### 3. CSS Variables / Design Tokens (MODERATE)
Update `globals.css` root variables to match the Stitch color system.

### 4. KPI Cards (MINOR — already close)
Current styling is already very close to the mockup. Small refinements to shadow, label typography.

### 5. Dashboard Layout (MINOR)
Add section label styling (`text-xs uppercase tracking-[0.15em]`).

### 6. Calendar Styling (MINOR)
FullCalendar theme overrides need the cyan glow current-time indicator and refined event blocks.

### 7. Font Update (MINOR)
Switch from Plus Jakarta Sans to Public Sans (headlines) + Inter (body).

## What Does NOT Change
- Sidebar width (w-64) — stays exactly 256px
- Main content offset (pl-64) — unchanged
- Desktop/mobile breakpoint behavior
- Functionality of any component
- Database or API layers
- Mobile layout patterns
