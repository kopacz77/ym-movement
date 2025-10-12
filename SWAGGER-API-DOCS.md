# Swagger API Documentation

This document explains how to use and extend the Swagger/OpenAPI documentation for the YM Movement Scheduler API.

## 🔒 Developer-Only Access

**IMPORTANT**: This API documentation is **ONLY accessible in development mode** for security reasons.

- ✅ **Development**: Available at [http://localhost:3100/api-docs](http://localhost:3100/api-docs)
- ❌ **Production**: Returns 404 (completely hidden from users)
- 🔐 **Security**: Both the UI and API endpoint are protected

### How It Works

1. The `/api-docs` page checks `NODE_ENV === "development"`
2. The `/api/openapi` endpoint also checks `NODE_ENV === "development"`
3. In production, both routes return 404 errors
4. No users, admins, or students can access this in production

## Accessing the Documentation

### Local Development
1. Start dev server: `pnpm dev` (runs on port 3100)
2. Visit [http://localhost:3100/api-docs](http://localhost:3100/api-docs)
3. You'll see a yellow "🔧 Development Only" badge confirming it's restricted

### Production
**Not accessible** - Returns 404 error to protect your API structure

## What's Included

The Swagger UI provides interactive API documentation with:

✅ **Complete endpoint catalog** - All TRPC endpoints documented
✅ **Request/Response schemas** - See exactly what data to send and receive
✅ **Interactive testing** - Try API calls directly from the browser
✅ **Authentication info** - NextAuth session cookie authentication details
✅ **Organized by features** - Endpoints grouped by Admin, Student, Notifications, etc.

## Current API Coverage

### Admin Endpoints

#### Analytics
- `GET /api/trpc/admin.analytics.getOverview` - Dashboard overview stats
- `GET /api/trpc/admin.analytics.getStudentActivity` - Activity data by period
- `GET /api/trpc/admin.analytics.getRevenueData` - Revenue breakdown

#### Scheduling
- `GET /api/trpc/admin.schedule.getRinkTimeSlots` - Get time slots
- `POST /api/trpc/admin.schedule.createTimeSlot` - Create new time slot

#### Students
- `GET /api/trpc/admin.student.getStudents` - List all students
- `POST /api/trpc/admin.student.approveStudent` - Approve registration

#### Payments
- `GET /api/trpc/admin.payment.getPayments` - List all payments
- `POST /api/trpc/admin.payment.markAsPaid` - Mark payment as completed

### Student Endpoints

#### Lessons
- `GET /api/trpc/student.lessons.getAvailableSlots` - Get bookable slots
- `POST /api/trpc/student.lessons.bookLesson` - Book a lesson

### System Endpoints

#### Notifications
- `GET /api/trpc/notifications.notifications.getNotifications` - Get user notifications
- `POST /api/trpc/notifications.notifications.markAsRead` - Mark notification read

## How to Add New Endpoints

When you add new TRPC procedures, update the OpenAPI spec in `src/lib/openapi.ts`:

```typescript
"/api/trpc/your.new.endpoint": {
  get: { // or post, put, delete
    tags: ["Your Category"],
    summary: "Brief description",
    description: "Detailed description of what this endpoint does",
    parameters: [ // For GET requests
      {
        name: "paramName",
        in: "query",
        required: true,
        schema: { type: "string" }
      }
    ],
    requestBody: { // For POST/PUT requests
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              fieldName: { type: "string" }
            },
            required: ["fieldName"]
          }
        }
      }
    },
    responses: {
      "200": {
        description: "Success response description",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                result: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

## Files Overview

### Core Files
- **`src/lib/openapi.ts`** - OpenAPI specification document
- **`src/app/api/openapi/route.ts`** - API endpoint that serves the spec
- **`src/app/api-docs/page.tsx`** - Swagger UI React page

### Dependencies
- **`swagger-ui-react`** - Swagger UI components
- **`trpc-openapi`** - TRPC to OpenAPI utilities (optional, not actively used)
- **`zod-to-json-schema`** - Convert Zod schemas to JSON Schema (future use)

## Authentication

The API uses **NextAuth session cookies** for authentication:
- Cookie name: `next-auth.session-token`
- Type: `apiKey` in `cookie`
- Required for most endpoints (public endpoints excluded)

## Schema Types

Common enum types documented:

- **LessonType**: `PRIVATE`, `SEMI_PRIVATE`, `GROUP`
- **LessonStatus**: `SCHEDULED`, `COMPLETED`, `CANCELLED`
- **PaymentStatus**: `PENDING`, `COMPLETED`, `FAILED`
- **RinkArea**: `FULL_RINK`, `HALF_RINK`, `QUARTER_RINK`

## Best Practices

1. **Keep documentation in sync** - Update OpenAPI spec when adding/modifying endpoints
2. **Use descriptive summaries** - Help developers understand endpoints quickly
3. **Document all parameters** - Include type, required status, and validation rules
4. **Add examples** - Show sample request/response payloads when helpful
5. **Group by feature** - Use consistent tags for organization

## Future Enhancements

Potential improvements to consider:

- [ ] Auto-generate OpenAPI spec from TRPC procedures using metadata
- [ ] Add request/response examples for each endpoint
- [ ] Include error response schemas
- [ ] Add authentication token testing within Swagger UI
- [ ] Generate TypeScript client from OpenAPI spec
- [ ] Add webhook documentation
- [ ] Include rate limiting information

## Troubleshooting

### Swagger UI not loading
- Check that dev server is running: `pnpm dev`
- Verify `/api/openapi` endpoint returns JSON: `curl http://localhost:3000/api/openapi`
- Clear browser cache and hard reload

### Missing endpoints
- Update `src/lib/openapi.ts` with new endpoint documentation
- Restart dev server to pick up changes

### Type mismatches
- Ensure OpenAPI schema matches actual TRPC procedure input/output
- Use Zod schema definitions as reference for types

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [TRPC Documentation](https://trpc.io/)
- [NextAuth.js](https://next-auth.js.org/)

---

**Last Updated**: 2025-10-12
**Version**: 3.0.0
