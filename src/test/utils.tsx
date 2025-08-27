import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });

// Mock session data
export const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "STUDENT",
  },
  expires: "2030-01-01",
};

export const mockAdminSession = {
  user: {
    id: "admin-user-id",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN",
  },
  expires: "2030-01-01",
};

// Provider wrapper for tests
interface ProvidersProps {
  children: React.ReactNode;
  session?: typeof mockSession | null;
}

const TestProviders = ({ children, session = null }: ProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>{children}</SessionProvider>
    </QueryClientProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: typeof mockSession | null;
}

export const renderWithProviders = (
  ui: ReactElement,
  { session = null, ...renderOptions }: CustomRenderOptions = {},
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders session={session}>{children}</TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock TRPC utilities
export const mockTRPCSuccess = <T,>(data: T) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
});

export const mockTRPCLoading = () => ({
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
});

export const mockTRPCError = (message: string) => ({
  data: undefined,
  isLoading: false,
  isError: true,
  error: { message },
});

// Router mock helpers
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

export const mockSearchParams = {
  get: vi.fn(),
};

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.prefetch.mockClear();
  mockRouter.back.mockClear();
  mockRouter.forward.mockClear();
  mockRouter.refresh.mockClear();
  mockSearchParams.get.mockClear();
};

// Test data factories
export const createMockStudent = (overrides = {}) => ({
  id: "student-1",
  userId: "user-1",
  phone: "123-456-7890",
  maxLessonsPerWeek: 3,
  level: "PRELIMINARY",
  isApproved: true,
  user: {
    id: "user-1",
    email: "student@example.com",
    name: "Test Student",
    role: "STUDENT",
  },
  ...overrides,
});

export const createMockLesson = (overrides = {}) => ({
  id: "lesson-1",
  studentId: "student-1",
  rinkId: "rink-1",
  startTime: new Date("2024-01-15T10:00:00Z"),
  endTime: new Date("2024-01-15T11:00:00Z"),
  duration: 60,
  type: "PRIVATE",
  area: "MAIN_RINK",
  status: "SCHEDULED",
  price: 75,
  student: createMockStudent(),
  rink: {
    id: "rink-1",
    name: "Test Rink",
    timezone: "America/Los_Angeles",
    address: "123 Test St",
  },
  ...overrides,
});

export const createMockTimeSlot = (overrides = {}) => ({
  id: "slot-1",
  rinkId: "rink-1",
  startTime: new Date("2024-01-15T10:00:00Z"),
  endTime: new Date("2024-01-15T11:00:00Z"),
  maxStudents: 1,
  isActive: true,
  lessons: [],
  rink: {
    id: "rink-1",
    name: "Test Rink",
    timezone: "America/Los_Angeles",
    address: "123 Test St",
  },
  ...overrides,
});
