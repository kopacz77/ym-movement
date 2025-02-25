import { createTRPCReact } from '@trpc/react-query';
// Updated import: use the router from "@/lib/root" rather than "@/server/api/root"
import type { AppRouter } from '@/lib/root';

export const api = createTRPCReact<AppRouter>();