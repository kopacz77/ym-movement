import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import LoginPage from "../page";
import { renderWithProviders, resetMocks } from "@/test/utils";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch for user role check
global.fetch = vi.fn();

describe("LoginPage", () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it("renders login form correctly", () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/welcome to ym movement/i)).toBeInTheDocument();
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const submitButton = screen.getByRole("button", { name: /login/i });
    await user.click(submitButton);

    // The form should not submit with empty fields
    expect(signIn).not.toHaveBeenCalled();
  });

  it("submits form with valid credentials", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Mock successful sign in
    (signIn as any).mockResolvedValue({ error: null });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        role: "STUDENT"
      }),
    });

    // Fill form
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    // Check if signIn was called with correct parameters
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });
    });
  });

  it("handles login error correctly", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Mock failed sign in
    (signIn as any).mockResolvedValue({ 
      error: "Invalid credentials" 
    });

    // Fill form
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });

    // Error should be displayed (toast notification)
    // Note: In a real app, you'd test the toast library's behavior
  });

  it("redirects admin users to admin dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Mock successful sign in
    (signIn as any).mockResolvedValue({ error: null });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        role: "ADMIN"
      }),
    });

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), "admin@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  it("redirects student users to student dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Mock successful sign in
    (signIn as any).mockResolvedValue({ error: null });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        role: "STUDENT"
      }),
    });

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), "student@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/student/dashboard");
    });
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Mock slow sign in
    let resolveSignIn: (value: any) => void;
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    (signIn as any).mockReturnValue(signInPromise);

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    // Button should be disabled while loading and show "Loading..."
    expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();

    // Resolve the promise
    resolveSignIn!({ error: null });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ role: "STUDENT" }),
    });

    // After resolution, it should redirect (router.push called)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/student/dashboard");
    });
  });

  it("handles network error during role fetch", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Mock successful sign in but failed role fetch
    (signIn as any).mockResolvedValue({ error: null });
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });

    // Should handle the error gracefully
    // In a real app, this might show an error message or redirect to a default page
  });
});