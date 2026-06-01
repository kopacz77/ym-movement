// src/lib/server-trpc.ts
//
// Server-side TRPC caller for use in async Server Components. Lets us prefetch
// data on the server during render (before any client JS runs), populate a
// React Query cache, and hydrate it on the client so child components render
// with data on first paint instead of showing a loading spinner.
//
// Usage:
//   const trpc = await getServerTrpc();
//   const lessons = await trpc.student.profile.getStudentLessons({...});
//
// Or, with React Query prefetch:
//   const qc = getQueryClient();
//   await qc.prefetchQuery({
//     queryKey: trpcKey,
//     queryFn: () => trpc.student.profile.getStudentLessons.query(args),
//   });
//
// IMPORTANT: this MUST only be imported from Server Components, route
// handlers, or other server-only contexts. Importing into a client component
// will pull the full appRouter into the client bundle.

import "server-only";

import { headers } from "next/headers";
import { appRouter } from "@/lib/root";
import { createTRPCContext } from "@/lib/trpc";

/**
 * Returns a TRPC caller bound to the current request's headers + session.
 * Each Server Component call gets its own caller with fresh context, so auth
 * checks (protectedProcedure et al.) work exactly as they do from the client.
 */
export async function getServerTrpc() {
  const h = await headers();
  const ctx = await createTRPCContext({ headers: h });
  return appRouter.createCaller(ctx);
}
