# 🔧 Swagger API Documentation - Quick Start

## What Is This?

A **developer-only** interactive API documentation tool that shows all your TRPC endpoints in a beautiful, testable interface.

## Quick Access

```bash
pnpm dev
```

Then visit: **http://localhost:3100/api-docs**

## 🔒 Security

- ✅ **Works**: Only in development mode (`NODE_ENV=development`)
- ❌ **Blocked**: Completely hidden in production (404 error)
- 🎯 **Purpose**: Developer tool for understanding and testing the API

## What You'll See

- **All Admin endpoints** - Analytics, scheduling, students, payments
- **All Student endpoints** - Lesson booking, availability
- **All System endpoints** - Notifications, authentication
- **Request/Response schemas** - Exact data structures
- **Interactive testing** - Try API calls directly in the browser

## Files

- `src/lib/openapi.ts` - API specification
- `src/app/api-docs/page.tsx` - Swagger UI page
- `src/app/api/openapi/route.ts` - JSON spec endpoint
- [SWAGGER-API-DOCS.md](SWAGGER-API-DOCS.md) - Full documentation

## Adding New Endpoints

When you add new TRPC procedures, update `src/lib/openapi.ts` to document them. See [SWAGGER-API-DOCS.md](SWAGGER-API-DOCS.md) for examples.

---

**Note**: This is NOT visible to users, admins, or students. It's purely a developer tool for you to understand and test the API structure during development.
