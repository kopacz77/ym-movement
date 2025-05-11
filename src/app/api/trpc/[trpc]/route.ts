import { appRouter } from "@/lib/root";
import { createTRPCContext } from "@/lib/trpc";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export const GET = async (req: Request) => {
  return handleRequest(req);
};

export const POST = async (req: Request) => {
  return handleRequest(req);
};

async function handleRequest(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
          }
        : undefined,
  });
}
