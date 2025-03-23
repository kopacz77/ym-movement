import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/lib/root";

export const api = createTRPCReact<AppRouter>();
