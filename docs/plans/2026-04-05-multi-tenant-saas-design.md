# Multi-Tenant SaaS Architecture Design

**Date:** 2026-04-05
**Status:** Approved (brainstorming complete)
**Scope:** Long-term architecture for licensing YM Movement to other coaching businesses

---

## Vision

Transform YM Movement from a single-tenant coaching platform into a licensable SaaS product. Start with figure skating coaches, expand to other coaching verticals over time.

### Design Constraints

- Start small (2-10 clients), scale to 50+ without re-architecture
- 1-person team — minimize operational overhead
- Don't delay first paying customer with over-engineering
- Preserve existing codebase where possible
- Data isolation by default (not by query discipline)

---

## Architecture Decision: Database-Per-Tenant

**Chosen approach:** Single codebase, single deployment, separate Neon database per tenant.

### Why This Over Alternatives

| Approach | Verdict | Reason |
|----------|---------|--------|
| Separate deployments per customer | Rejected | Ops overhead grows linearly, no central admin, hard to evolve to SaaS |
| Shared DB with tenant column | Rejected | Huge refactor (every query needs tenantId), cross-tenant leak risk, delays licensing by 3-6 months |
| **Database-per-tenant (chosen)** | **Selected** | Minimal code changes, perfect isolation, Neon's model aligns, existing schema unchanged |

### How It Works

1. A lightweight **control plane database** (the current Neon project) stores a `tenants` table mapping domains/subdomains to tenant database connection strings
2. Each tenant gets their own **Neon project** (not a branch — projects give true compute isolation)
3. Prisma client is instantiated per-request using the tenant's `DATABASE_URL`
4. Branding and config stored in each tenant's existing `Settings` table
5. Neon API provisions new tenant databases programmatically

---

## Infrastructure Decisions

### Database: Stay on Neon PostgreSQL

**Rationale:** Scale-to-zero is the killer feature for database-per-tenant. Coaching databases are idle 90%+ of the time — you only pay storage (~$0.03/mo) for idle tenants.

| Scale | Neon Plan | Monthly Cost |
|-------|-----------|-------------|
| 1-10 tenants | Launch ($19/mo) | ~$22-25 |
| 10-50 tenants | Scale ($69/mo) | ~$72-80 |
| 50-200 tenants | Scale ($69/mo) | ~$80-120 |
| 200+ tenants | Business ($700/mo) | ~$700+ |

**Alternatives evaluated and rejected:**

- **Supabase:** $130/mo at 5 tenants vs Neon's $22. No scale-to-zero. PITR is $100/mo add-on per project.
- **Railway PostgreSQL:** No PITR (critical after 2026-04-05 data loss incident), no scale-to-zero.
- **Self-hosted (Hetzner):** Cheapest cash cost but 8-15 hrs/mo DBA time. Not worth it for a 1-person team.
- **PlanetScale:** MySQL — incompatible with schema (uses PostgreSQL `Int[]` arrays).
- **Turso:** SQLite — schema incompatible, no adequate PITR, immature Prisma support.

### Hosting: Migrate from Netlify to Vercel

**Rationale:** Netlify has real limitations for where this is heading.

| Issue with Netlify | Vercel Solution |
|-------------------|-----------------|
| 2 GB build heap (TypeScript checks disabled) | Higher build memory, native Next.js support |
| 1-3s cold starts on tRPC calls | Fluid Compute keeps functions warm (300-800ms) |
| No wildcard subdomain support | First-class multi-tenant: wildcard domains, Platforms SDK |
| 99-alias custom domain limit | 100K domain soft limit |
| Serverless Prisma connection churn | Fluid Compute pools connections across requests |

**Cost:** $20/mo Pro plan covers 5-50 tenants at normal coaching app traffic.

**Migration effort:** 2-4 hours. Remove `@netlify/plugin-nextjs`, update env vars, update CORS origins.

**Fallback:** Keep the existing Dockerfile maintained. If Vercel pricing surprises at scale, Railway (~$35/mo) or Hetzner + Coolify (~$7-15/mo) are viable Docker-native alternatives.

### Authentication: Keep NextAuth Now, Migrate to Neon Auth/Better Auth Later

**Rationale:** The current NextAuth setup works and has been hardened (lockout, CAPTCHA, rate limiting, timing-safe comparison). Rewriting 59 files / 288 references for features not yet needed (2FA, passkeys, orgs) is premature.

**Future migration trigger:** When building tenant onboarding (Phase 2), migrate to Neon Auth/Better Auth. The organization plugin maps directly to "each coaching business is a tenant."

| Capability | Current (NextAuth) | Future (Neon Auth/Better Auth) |
|------------|-------------------|-------------------------------|
| Email/password | Custom (works) | Built-in |
| RBAC | Custom tRPC middleware | Native plugin |
| Multi-tenant orgs | Not implemented | Built-in organization plugin |
| 2FA / Passkeys | Not implemented | Built-in |
| Branch-aware auth | N/A | Auth state branches with Neon DB |

---

## What Needs to Change (and What Doesn't)

### Changes Required

**1. Branding extraction** (needed regardless of approach)
- Extract ~32 files of hardcoded "YM Movement" strings into tenant config
- Move email templates to use config-driven branding
- Make landing page content configurable
- Move payment handles from hardcoded defaults to Settings-only

**2. Tenant routing layer**
- Control plane database with `tenants` table
- Middleware rewrite: extract subdomain from `req.headers.get("host")`, resolve tenant
- Prisma client factory: instantiate per-request with tenant's `DATABASE_URL`
- `next.config.js` CORS: dynamic origin logic instead of hardcoded domain

**3. Tenant provisioning**
- API endpoint or admin tool to create new tenants
- Calls Neon API to create project, runs `prisma migrate deploy`
- Stores connection string (encrypted) in control plane

**4. Schema flexibility (later)**
- Move `LessonType`, `Level`, `RinkArea` enums from Prisma schema to database config tables
- Allows each tenant to define their own lesson types and skill levels
- Not needed for initial figure skating coaches — same terminology

### No Changes Required

- Core scheduling logic (time slots, lessons, booking)
- Payment tracking system
- Google Calendar integration (already per-coach OAuth)
- Student approval workflow
- Admin dashboard structure
- Notification system
- Redis caching layer

---

## Phased Implementation Plan

### Phase 1: Foundation (Weeks 1-3)
- Extract hardcoded branding into tenant configuration
- Migrate hosting from Netlify to Vercel
- Set up wildcard domain on Vercel
- Keep single database — just make branding configurable

### Phase 2: Tenant Isolation (Weeks 4-7)
- Create control plane schema (`tenants` table)
- Build Prisma client factory for per-request DB routing
- Implement subdomain-based tenant resolution in middleware
- Build tenant provisioning via Neon API
- Automated `prisma migrate deploy` on new tenant databases

### Phase 3: Auth & Onboarding (Weeks 8-12)
- Migrate from NextAuth to Neon Auth/Better Auth
- Implement organization plugin for tenant membership
- Build self-service tenant signup flow
- Add 2FA support
- Tenant admin dashboard for managing their own coaches/students

### Phase 4: Generalization (Future)
- Move sport-specific enums to configurable database tables
- Custom lesson types per tenant
- Custom skill levels per tenant
- White-label theming (colors, logos, fonts per tenant)
- Tenant billing and usage metering

---

## Cost Projection

| Scale | Database (Neon) | Hosting (Vercel) | Total |
|-------|----------------|-----------------|-------|
| Current (1 tenant) | ~$19/mo | ~$20/mo | ~$39/mo |
| 5 tenants | ~$22/mo | ~$20/mo | ~$42/mo |
| 20 tenants | ~$25/mo | ~$30-60/mo | ~$55-85/mo |
| 50 tenants | ~$75/mo | ~$60-100/mo | ~$135-175/mo |

At even $50/mo per tenant license fee, 5 tenants = $250/mo revenue against ~$42/mo infrastructure cost.

---

## Key Risks

| Risk | Mitigation |
|------|-----------|
| Neon cold start (200-500ms after idle) | Configure longer idle timeouts for active tenants; acceptable for coaching app UX |
| Vercel usage-based billing surprises | Set billing alerts at $50 and $100/mo; keep Docker fallback to Railway |
| Neon acquired by Databricks — strategic uncertainty | Prisma abstracts the database layer; can migrate to any PostgreSQL with pg_dump |
| Schema migrations across many tenant DBs | Automated migration pipeline with rollback capability |
| Cross-tenant analytics | Separate reporting layer that fan-out queries across tenant DBs, or ETL to analytics DB |

---

## References

- [Neon Database-Per-Tenant](https://neon.com/use-cases/database-per-tenant)
- [Neon Multi-Tenancy Guide](https://neon.com/docs/guides/multitenancy)
- [Neon Auth Overview](https://neon.com/docs/auth/overview)
- [Vercel Multi-Tenant Platforms](https://vercel.com/docs/multi-tenant)
- [Better Auth vs NextAuth 2026](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk)
- [Scaling Multi-Tenant Architecture at Shopify](https://www.youtube.com/watch?v=F-f0-k46WVk)
