// __tests__/auth/password-change.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePasswordForm from "@/features/auth/components/ChangePasswordForm";
import { createMaliciousInput } from "../helpers/test-data";

// Mock the API
const mockChangePassword = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    admin: {
      auth: {
        changePassword: {
          useMutation: () => ({
            mutate: mockChangePassword,
            isPending: false,
          }),
        },
      },
    },
  },
}));

describe("Password Change Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render password change form", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("should validate password confirmation", async () => {
    render(<ChangePasswordForm />);

    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(currentPassword, { target: { value: "CurrentPass123!" } });
    fireEvent.change(newPassword, { target: { value: "NewPassword123!" } });
    fireEvent.change(confirmPassword, { target: { value: "DifferentPass123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("should enforce minimum password length", async () => {
    render(<ChangePasswordForm />);

    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(currentPassword, { target: { value: "CurrentPass123!" } });
    fireEvent.change(newPassword, { target: { value: "short" } });
    fireEvent.change(confirmPassword, { target: { value: "short" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password too short/i)).toBeInTheDocument();
    });

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("should sanitize malicious input", async () => {
    const maliciousInput = createMaliciousInput();
    render(<ChangePasswordForm />);

    const currentPassword = screen.getByLabelText(/current password/i);
    fireEvent.change(currentPassword, { target: { value: maliciousInput.xssPayload } });

    // Input should be sanitized
    expect((currentPassword as HTMLInputElement).value).not.toContain("<script>");
  });

  it("should submit valid password change", async () => {
    render(<ChangePasswordForm />);

    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole("button", { name: /update password/i });

    fireEvent.change(currentPassword, { target: { value: "CurrentPass123!" } });
    fireEvent.change(newPassword, { target: { value: "NewPassword123!" } });
    fireEvent.change(confirmPassword, { target: { value: "NewPassword123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: expect.any(String),
        newPassword: expect.any(String),
      });
    });
  });

  it("should show password strength indicator", () => {
    render(<ChangePasswordForm />);

    const newPassword = screen.getByLabelText(/new password/i);
    fireEvent.change(newPassword, { target: { value: "WeakPassword123!" } });

    // Should show password strength component
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should disable submit button while loading", () => {
    vi.mocked(mockChangePassword).mockImplementation(() => ({
      mutate: vi.fn(),
      isPending: true,
    }));

    render(<ChangePasswordForm />);

    const submitButton = screen.getByRole("button", { name: /updating/i });
    expect(submitButton).toBeDisabled();
  });

  it("should clear form on successful password change", async () => {
    mockChangePassword.mockImplementation(({ onSuccess }) => {
      if (onSuccess) onSuccess();
      return { mutate: vi.fn(), isPending: false };
    });

    render(<ChangePasswordForm />);

    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPassword, { target: { value: "CurrentPass123!" } });
    fireEvent.change(newPassword, { target: { value: "NewPassword123!" } });
    fireEvent.change(confirmPassword, { target: { value: "NewPassword123!" } });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect((currentPassword as HTMLInputElement).value).toBe("");
      expect((newPassword as HTMLInputElement).value).toBe("");
      expect((confirmPassword as HTMLInputElement).value).toBe("");
    });
  });

  it("should handle server-side password policy validation", async () => {
    mockChangePassword.mockImplementation(({ onError }) => {
      if (onError) {
        onError({
          message: "Password does not meet security requirements: must contain uppercase",
        });
      }
      return { mutate: vi.fn(), isPending: false };
    });

    render(<ChangePasswordForm />);

    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPassword, { target: { value: "CurrentPass123!" } });
    fireEvent.change(newPassword, { target: { value: "weakpassword123!" } });
    fireEvent.change(confirmPassword, { target: { value: "weakpassword123!" } });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/security requirements/i)).toBeInTheDocument();
    });
  });
});
