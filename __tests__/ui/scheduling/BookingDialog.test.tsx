// __tests__/ui/scheduling/BookingDialog.test.tsx
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingDialog } from '@/features/admin/components/scheduling/BookingDialog';
import { createTestStudent, createMaliciousInput } from '../../helpers/test-data';

// Mock the sanitization hook
vi.mock('@/hooks/useSanitizedInput', () => ({
  useSanitizedInput: () => ({
    sanitizeInput: (input: string) => {
      if (!input) return '';
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+=/gi, '')
        .substring(0, 10000);
    }
  })
}));

// Mock TRPC
const mockMutation = {
  mutate: vi.fn(),
  isLoading: false,
  error: null
};

const mockStudentsQuery = {
  data: [
    createTestStudent({ id: '1', name: 'John Doe', email: 'john@example.com' }),
    createTestStudent({ id: '2', name: 'Jane Smith', email: 'jane@example.com' })
  ],
  isLoading: false,
  error: null
};

vi.mock('@/lib/api', () => ({
  api: {
    admin: {
      schedule: {
        lessons: {
          create: {
            useMutation: () => mockMutation
          }
        }
      },
      students: {
        getAll: {
          useQuery: () => mockStudentsQuery
        }
      }
    }
  }
}));

// Mock dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>
}));

describe('BookingDialog Component', () => {
  const user = userEvent.setup();
  const mockTimeSlot = {
    id: 'slot-123',
    startTime: new Date('2025-01-30T10:00:00Z'),
    endTime: new Date('2025-01-30T11:00:00Z'),
    rinkId: 'rink-1',
    isAvailable: true
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    timeSlot: mockTimeSlot,
    onBookingComplete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('should render dialog when open', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent(/book lesson/i);
    });

    it('should not render dialog when closed', () => {
      render(<BookingDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display time slot information', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByText(/10:00 AM - 11:00 AM/)).toBeInTheDocument();
      expect(screen.getByText(/January 30, 2025/)).toBeInTheDocument();
    });
  });

  describe('Student Selection', () => {
    it('should render student selection dropdown', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByLabelText(/select student/i)).toBeInTheDocument();
    });

    it('should populate student options from query', () => {
      render(<BookingDialog {...defaultProps} />);

      const studentSelect = screen.getByLabelText(/select student/i);
      fireEvent.click(studentSelect);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should show loading state for students', () => {
      mockStudentsQuery.isLoading = true;
      mockStudentsQuery.data = undefined;

      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByText(/loading students/i)).toBeInTheDocument();
    });

    it('should handle student query error', () => {
      mockStudentsQuery.error = new Error('Failed to load students');
      mockStudentsQuery.data = undefined;

      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByText(/error loading students/i)).toBeInTheDocument();
    });
  });

  describe('Lesson Type Selection', () => {
    it('should render lesson type options', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByLabelText(/lesson type/i)).toBeInTheDocument();
    });

    it('should include common lesson types', () => {
      render(<BookingDialog {...defaultProps} />);

      const lessonTypeSelect = screen.getByLabelText(/lesson type/i);
      fireEvent.click(lessonTypeSelect);

      expect(screen.getByText(/private lesson/i)).toBeInTheDocument();
      expect(screen.getByText(/group lesson/i)).toBeInTheDocument();
      expect(screen.getByText(/skills assessment/i)).toBeInTheDocument();
    });
  });

  describe('Notes Input', () => {
    it('should render notes textarea', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByLabelText(/lesson notes/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/any special requirements/i)).toBeInTheDocument();
    });

    it('should show character count for notes', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByText(/0 \/ 500/)).toBeInTheDocument();
    });

    it('should update character count as user types', async () => {
      render(<BookingDialog {...defaultProps} />);

      const notesInput = screen.getByLabelText(/lesson notes/i);
      await user.type(notesInput, 'Test notes');

      expect(screen.getByText(/10 \/ 500/)).toBeInTheDocument();
    });

    it('should sanitize malicious input in notes', async () => {
      const maliciousInput = createMaliciousInput();
      render(<BookingDialog {...defaultProps} />);

      // Fill required fields
      const studentSelect = screen.getByLabelText(/select student/i);
      fireEvent.change(studentSelect, { target: { value: '1' } });

      const lessonTypeSelect = screen.getByLabelText(/lesson type/i);
      fireEvent.change(lessonTypeSelect, { target: { value: 'Private Lesson' } });

      const notesInput = screen.getByLabelText(/lesson notes/i);
      await user.type(notesInput, maliciousInput.xssPayload);

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: expect.not.stringContaining('<script>')
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should require student selection', async () => {
      render(<BookingDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please select a student/i)).toBeInTheDocument();
      });
    });

    it('should require lesson type selection', async () => {
      render(<BookingDialog {...defaultProps} />);

      const studentSelect = screen.getByLabelText(/select student/i);
      fireEvent.change(studentSelect, { target: { value: '1' } });

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please select a lesson type/i)).toBeInTheDocument();
      });
    });

    it('should validate notes length', async () => {
      render(<BookingDialog {...defaultProps} />);

      const longNotes = 'a'.repeat(501); // Exceeds 500 char limit
      const notesInput = screen.getByLabelText(/lesson notes/i);
      await user.type(notesInput, longNotes);

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/notes must be less than 500 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit valid booking data', async () => {
      render(<BookingDialog {...defaultProps} />);

      // Fill form
      const studentSelect = screen.getByLabelText(/select student/i);
      fireEvent.change(studentSelect, { target: { value: '1' } });

      const lessonTypeSelect = screen.getByLabelText(/lesson type/i);
      fireEvent.change(lessonTypeSelect, { target: { value: 'Private Lesson' } });

      const notesInput = screen.getByLabelText(/lesson notes/i);
      await user.type(notesInput, 'First lesson for beginner');

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith({
          timeSlotId: 'slot-123',
          studentId: '1',
          lessonType: 'Private Lesson',
          notes: 'First lesson for beginner'
        });
      });
    });

    it('should handle submission success', async () => {
      mockMutation.mutate.mockImplementation((data, { onSuccess }) => {
        if (onSuccess) onSuccess({ id: 'lesson-123', ...data });
      });

      render(<BookingDialog {...defaultProps} />);

      // Fill and submit form
      const studentSelect = screen.getByLabelText(/select student/i);
      fireEvent.change(studentSelect, { target: { value: '1' } });

      const lessonTypeSelect = screen.getByLabelText(/lesson type/i);
      fireEvent.change(lessonTypeSelect, { target: { value: 'Private Lesson' } });

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onBookingComplete).toHaveBeenCalled();
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should handle submission error', async () => {
      const errorMessage = 'Time slot is no longer available';
      mockMutation.mutate.mockImplementation((data, { onError }) => {
        if (onError) onError(new Error(errorMessage));
      });

      render(<BookingDialog {...defaultProps} />);

      // Fill and submit form
      const studentSelect = screen.getByLabelText(/select student/i);
      fireEvent.change(studentSelect, { target: { value: '1' } });

      const lessonTypeSelect = screen.getByLabelText(/lesson type/i);
      fireEvent.change(lessonTypeSelect, { target: { value: 'Private Lesson' } });

      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', () => {
      mockMutation.isLoading = true;

      render(<BookingDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /booking/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/booking/i);
    });

    it('should disable form fields during submission', () => {
      mockMutation.isLoading = true;

      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByLabelText(/select student/i)).toBeDisabled();
      expect(screen.getByLabelText(/lesson type/i)).toBeDisabled();
      expect(screen.getByLabelText(/lesson notes/i)).toBeDisabled();
    });
  });

  describe('Conflict Detection', () => {
    it('should show warning for potential conflicts', () => {
      const conflictTimeSlot = {
        ...mockTimeSlot,
        conflicts: ['Student already has a lesson at this time']
      };

      render(<BookingDialog {...defaultProps} timeSlot={conflictTimeSlot} />);

      expect(screen.getByText(/potential conflict/i)).toBeInTheDocument();
      expect(screen.getByText(/student already has a lesson/i)).toBeInTheDocument();
    });

    it('should allow override of minor conflicts', async () => {
      const conflictTimeSlot = {
        ...mockTimeSlot,
        conflicts: ['Minor scheduling overlap']
      };

      render(<BookingDialog {...defaultProps} timeSlot={conflictTimeSlot} />);

      expect(screen.getByLabelText(/override conflict/i)).toBeInTheDocument();

      const overrideCheckbox = screen.getByLabelText(/override conflict/i);
      await user.click(overrideCheckbox);

      expect(overrideCheckbox).toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByLabelText(/select student/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/lesson type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/lesson notes/i)).toBeInTheDocument();
    });

    it('should have proper dialog ARIA attributes', () => {
      render(<BookingDialog {...defaultProps} />);

      const dialog = screen.getByTestId('dialog-content');
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should focus on first input when opened', () => {
      render(<BookingDialog {...defaultProps} />);

      const studentSelect = screen.getByLabelText(/select student/i);
      expect(studentSelect).toHaveFocus();
    });

    it('should trap focus within dialog', async () => {
      render(<BookingDialog {...defaultProps} />);

      const studentSelect = screen.getByLabelText(/select student/i);
      const submitButton = screen.getByRole('button', { name: /book lesson/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Tab through elements
      expect(studentSelect).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/lesson type/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/lesson notes/i)).toHaveFocus();
      
      await user.tab();
      expect(cancelButton).toHaveFocus();
      
      await user.tab();
      expect(submitButton).toHaveFocus();
      
      // Should wrap back to first element
      await user.tab();
      expect(studentSelect).toHaveFocus();
    });
  });

  describe('Dialog Controls', () => {
    it('should close dialog on cancel button click', async () => {
      render(<BookingDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should close dialog on escape key press', async () => {
      render(<BookingDialog {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should prevent closing during submission', () => {
      mockMutation.isLoading = true;

      render(<BookingDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Time Slot Display', () => {
    it('should format time slot information correctly', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByText(/10:00 AM - 11:00 AM/)).toBeInTheDocument();
      expect(screen.getByText(/January 30, 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Thursday/)).toBeInTheDocument();
    });

    it('should show duration information', () => {
      render(<BookingDialog {...defaultProps} />);

      expect(screen.getByText(/60 minutes/)).toBeInTheDocument();
    });

    it('should handle different time zones', () => {
      const timeSlot = {
        ...mockTimeSlot,
        startTime: new Date('2025-01-30T15:00:00Z'), // 3 PM UTC
        endTime: new Date('2025-01-30T16:00:00Z')    // 4 PM UTC
      };

      render(<BookingDialog {...defaultProps} timeSlot={timeSlot} />);

      // Should display in user's local time zone
      expect(screen.getByText(/3:00 PM - 4:00 PM|10:00 AM - 11:00 AM/)).toBeInTheDocument();
    });
  });
});