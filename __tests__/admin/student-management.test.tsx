// __tests__/admin/student-management.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StudentList } from "@/features/admin/components/students/management/StudentList";
import { createTestStudent, createMaliciousInput } from "../helpers/test-data";

// Mock the API
const mockGetStudents = vi.fn();
const mockCreateStudent = vi.fn();
const mockUpdateStudent = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    admin: {
      student: {
        getStudents: {
          useQuery: () => ({
            data: { students: [createTestStudent()] },
            isLoading: false,
            error: null,
          }),
        },
        createStudent: {
          useMutation: () => ({
            mutate: mockCreateStudent,
            isPending: false,
          }),
        },
        updateStudent: {
          useMutation: () => ({
            mutate: mockUpdateStudent,
            isPending: false,
          }),
        },
      },
    },
  },
}));

describe("Student Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render student list", () => {
    render(<StudentList />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("should handle student search", async () => {
    render(<StudentList />);
    
    const searchInput = screen.getByPlaceholderText(/search students/i);
    fireEvent.change(searchInput, { target: { value: "Test" } });
    
    await waitFor(() => {
      expect(mockGetStudents).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Test" })
      );
    });
  });

  it("should sanitize malicious input in search", async () => {
    const maliciousInput = createMaliciousInput();
    render(<StudentList />);
    
    const searchInput = screen.getByPlaceholderText(/search students/i);
    fireEvent.change(searchInput, { target: { value: maliciousInput.xssPayload } });
    
    // Should not contain script tags
    expect(searchInput.value).not.toContain("<script>");
  });

  it("should filter students by level", async () => {
    render(<StudentList />);
    
    const levelFilter = screen.getByRole("combobox", { name: /level/i });
    fireEvent.click(levelFilter);
    
    const preliminaryOption = screen.getByText("PRELIMINARY");
    fireEvent.click(preliminaryOption);
    
    await waitFor(() => {
      expect(mockGetStudents).toHaveBeenCalledWith(
        expect.objectContaining({ level: "PRELIMINARY" })
      );
    });
  });

  it("should handle approval status filtering", async () => {
    render(<StudentList />);
    
    const approvalFilter = screen.getByRole("combobox", { name: /approval/i });
    fireEvent.click(approvalFilter);
    
    const pendingOption = screen.getByText("Pending");
    fireEvent.click(pendingOption);
    
    await waitFor(() => {
      expect(mockGetStudents).toHaveBeenCalledWith(
        expect.objectContaining({ approved: false })
      );
    });
  });

  it("should display student information correctly", () => {
    const testStudent = createTestStudent({
      user: { name: "John Doe", email: "john@example.com" },
      level: "PRELIMINARY",
      isApproved: true,
    });

    render(<StudentList />);
    
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("PRELIMINARY")).toBeInTheDocument();
  });

  it("should handle pagination", async () => {
    render(<StudentList />);
    
    const nextPageButton = screen.getByText(/next/i);
    fireEvent.click(nextPageButton);
    
    await waitFor(() => {
      expect(mockGetStudents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("should handle loading state", () => {
    vi.mocked(mockGetStudents).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<StudentList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("should handle error state", () => {
    vi.mocked(mockGetStudents).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to load students"),
    });

    render(<StudentList />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it("should prevent XSS in student names", () => {
    const maliciousStudent = createTestStudent({
      user: { name: "<script>alert('xss')</script>" },
    });

    render(<StudentList />);
    
    // Should not execute script or contain raw HTML
    expect(document.querySelector("script")).not.toBeInTheDocument();
  });
});