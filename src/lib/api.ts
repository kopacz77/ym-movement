import type { AppRouter } from "@/lib/root";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
