import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, mockAdminSession } from "@/test/utils";
import { EditCoachPricingDialog } from "../EditCoachPricingDialog";

// Mock the api module
const mockMutate = vi.fn();
vi.mock("@/lib/api", () => ({
  api: {
    admin: {
      coach: {
        management: {
          updateCoachPricing: {
            useMutation: (opts: Record<string, unknown>) => {
              // Store callbacks for later use
              (mockMutate as any)._opts = opts;
              return {
                mutate: mockMutate,
                isPending: false,
              };
            },
          },
        },
      },
    },
  },
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  coachId: "coach-123",
  coachName: "Jane Smith",
  currentPricing: {
    privateLessonPrice: 120,
    groupLessonPrice: 80,
    choreographyPrice: 150,
    competitionPrepPrice: 200,
    offIceDancePrice: 100,
    revenueSplitPercent: 70,
  },
};

const nullPricingProps = {
  ...defaultProps,
  currentPricing: {
    privateLessonPrice: null,
    groupLessonPrice: null,
    choreographyPrice: null,
    competitionPrepPrice: null,
    offIceDancePrice: null,
    revenueSplitPercent: 50,
  },
};

describe("EditCoachPricingDialog", () => {
  it("renders dialog title with coach name", () => {
    renderWithProviders(<EditCoachPricingDialog {...defaultProps} />, {
      session: mockAdminSession,
    });

    expect(screen.getByText("Edit Pricing - Jane Smith")).toBeInTheDocument();
  });

  it("renders all 6 input fields", () => {
    renderWithProviders(<EditCoachPricingDialog {...defaultProps} />, {
      session: mockAdminSession,
    });

    expect(screen.getByLabelText("Private Lesson ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Group Lesson ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Choreography ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Competition Prep ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Off-Ice Dance ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Revenue Split (%)")).toBeInTheDocument();
  });

  it("populates inputs with current pricing values", () => {
    renderWithProviders(<EditCoachPricingDialog {...defaultProps} />, {
      session: mockAdminSession,
    });

    expect(screen.getByLabelText("Private Lesson ($)")).toHaveValue(120);
    expect(screen.getByLabelText("Group Lesson ($)")).toHaveValue(80);
    expect(screen.getByLabelText("Choreography ($)")).toHaveValue(150);
    expect(screen.getByLabelText("Competition Prep ($)")).toHaveValue(200);
    expect(screen.getByLabelText("Off-Ice Dance ($)")).toHaveValue(100);
    expect(screen.getByLabelText("Revenue Split (%)")).toHaveValue(70);
  });

  it("shows empty inputs with placeholder for null pricing", () => {
    renderWithProviders(<EditCoachPricingDialog {...nullPricingProps} />, {
      session: mockAdminSession,
    });

    const privateInput = screen.getByLabelText("Private Lesson ($)");
    expect(privateInput).toHaveValue(null);
    expect(privateInput).toHaveAttribute("placeholder", "Default");
  });

  it("calls mutate with correct payload on submit", async () => {
    renderWithProviders(<EditCoachPricingDialog {...defaultProps} />, {
      session: mockAdminSession,
    });

    const submitButton = screen.getByRole("button", { name: "Save Pricing" });
    fireEvent.click(submitButton);

    expect(mockMutate).toHaveBeenCalledWith({
      coachId: "coach-123",
      privateLessonPrice: 120,
      groupLessonPrice: 80,
      choreographyPrice: 150,
      competitionPrepPrice: 200,
      offIceDancePrice: 100,
      revenueSplitPercent: 70,
    });
  });

  it("sends undefined (not 0) for empty price fields", async () => {
    renderWithProviders(<EditCoachPricingDialog {...nullPricingProps} />, {
      session: mockAdminSession,
    });

    const submitButton = screen.getByRole("button", { name: "Save Pricing" });
    fireEvent.click(submitButton);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        coachId: "coach-123",
        privateLessonPrice: undefined,
        groupLessonPrice: undefined,
        choreographyPrice: undefined,
        competitionPrepPrice: undefined,
        offIceDancePrice: undefined,
      }),
    );
  });

  it("syncs inputs when reopened with different coach data", async () => {
    const { rerender } = renderWithProviders(
      <EditCoachPricingDialog {...defaultProps} />,
      { session: mockAdminSession },
    );

    // Verify initial values
    expect(screen.getByLabelText("Private Lesson ($)")).toHaveValue(120);

    // Rerender with different coach data (simulates closing and reopening)
    const newProps = {
      ...defaultProps,
      coachName: "John Doe",
      currentPricing: {
        privateLessonPrice: 200,
        groupLessonPrice: 100,
        choreographyPrice: 180,
        competitionPrepPrice: 250,
        offIceDancePrice: 130,
        revenueSplitPercent: 80,
      },
    };

    rerender(
      <EditCoachPricingDialog {...newProps} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Private Lesson ($)")).toHaveValue(200);
    });

    expect(screen.getByText("Edit Pricing - John Doe")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(
      <EditCoachPricingDialog {...defaultProps} open={false} />,
      { session: mockAdminSession },
    );

    expect(screen.queryByText("Edit Pricing - Jane Smith")).not.toBeInTheDocument();
  });
});
