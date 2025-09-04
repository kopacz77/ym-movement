import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock NextAuth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        role: "ADMIN",
      },
    },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));

// Mock dynamic imports
vi.mock("next/dynamic", () => ({
  default: (dynamicFunction: () => Promise<any>, options: any = {}) => {
    const DynamicComponent = (props: any) => {
      // For testing, just return a simple div
      return options.loading ? options.loading() : "Dynamic Component";
    };
    DynamicComponent.displayName = "MockedDynamicComponent";
    return DynamicComponent;
  },
}));

// Mock Prisma Client
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  lesson: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  payment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  rink: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  rinkTimeSlot: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock TRPC
vi.mock("@/lib/api", () => ({
  api: {
    admin: {
      student: {
        getStudents: {
          useQuery: vi.fn(() => ({
            data: { students: [] },
            isLoading: false,
            error: null,
          })),
        },
        getStudent: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
        createStudent: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
      schedule: {
        createLesson: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
      auth: {
        changePassword: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
    },
  },
}));

// Export mocks for use in tests
export { mockPrisma };
