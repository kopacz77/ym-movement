// __tests__/ui/forms/StudentForm.test.tsx
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentForm } from '@/features/admin/components/students/profile/StudentForm';
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

vi.mock('@/lib/api', () => ({
  api: {
    admin: {
      students: {
        create: {
          useMutation: () => mockMutation
        },
        update: {
          useMutation: () => mockMutation
        }
      }
    }
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('StudentForm Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render all required form fields', () => {
      render(<StudentForm />);

      expect(screen.getByLabelText(/student name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByText(/emergency contact/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create student/i })).toBeInTheDocument();
    });

    it('should render emergency contact fields', () => {
      render(<StudentForm />);

      expect(screen.getByLabelText(/emergency contact name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/emergency contact phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
    });

    it('should show edit mode when student data is provided', () => {
      const studentData = createTestStudent();
      render(<StudentForm student={studentData} />);

      expect(screen.getByDisplayValue(studentData.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(studentData.email)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update student/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      render(<StudentForm />);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<StudentForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      render(<StudentForm />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '123'); // Too short

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });

    it('should validate name length limits', async () => {
      render(<StudentForm />);

      const nameInput = screen.getByLabelText(/student name/i);
      const longName = 'a'.repeat(101); // Exceeds 100 char limit
      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name must be less than 100 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate notes length limits', async () => {
      render(<StudentForm />);

      const notesInput = screen.getByLabelText(/notes/i);
      const longNotes = 'a'.repeat(1001); // Exceeds 1000 char limit
      await user.type(notesInput, longNotes);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/notes must be less than 1000 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input in name field', async () => {
      const maliciousInput = createMaliciousInput();
      render(<StudentForm />);

      const nameInput = screen.getByLabelText(/student name/i);
      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(nameInput, maliciousInput.xssPayload);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.not.stringContaining('<script>')
          })
        );
      });
    });

    it('should sanitize malicious input in notes field', async () => {
      const maliciousInput = createMaliciousInput();
      render(<StudentForm />);

      const nameInput = screen.getByLabelText(/student name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const notesInput = screen.getByLabelText(/notes/i);

      await user.type(nameInput, 'Test Student');
      await user.type(emailInput, 'test@example.com');
      await user.type(notesInput, maliciousInput.htmlInjection);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: expect.not.stringContaining('<img')
          })
        );
      });
    });

    it('should sanitize emergency contact information', async () => {
      const maliciousInput = createMaliciousInput();
      render(<StudentForm />);

      const nameInput = screen.getByLabelText(/student name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const emergencyNameInput = screen.getByLabelText(/emergency contact name/i);
      const emergencyPhoneInput = screen.getByLabelText(/emergency contact phone/i);
      const relationshipInput = screen.getByLabelText(/relationship/i);

      await user.type(nameInput, 'Test Student');
      await user.type(emailInput, 'test@example.com');
      await user.type(emergencyNameInput, maliciousInput.xssPayload);
      await user.type(emergencyPhoneInput, '555-0123');
      await user.type(relationshipInput, maliciousInput.htmlInjection);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            emergencyContact: expect.objectContaining({
              name: expect.not.stringContaining('<script>'),
              relationship: expect.not.stringContaining('<img')
            })
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form data', async () => {
      const studentData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        notes: 'Beginner skater'
      };

      render(<StudentForm />);

      await user.type(screen.getByLabelText(/student name/i), studentData.name);
      await user.type(screen.getByLabelText(/email address/i), studentData.email);
      await user.type(screen.getByLabelText(/phone number/i), studentData.phone);
      await user.type(screen.getByLabelText(/notes/i), studentData.notes);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: studentData.name,
            email: studentData.email,
            phone: studentData.phone,
            notes: studentData.notes
          })
        );
      });
    });

    it('should include emergency contact when provided', async () => {
      render(<StudentForm />);

      await user.type(screen.getByLabelText(/student name/i), 'Test Student');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/emergency contact name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/emergency contact phone/i), '555-0456');
      await user.type(screen.getByLabelText(/relationship/i), 'Mother');

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            emergencyContact: {
              name: 'Jane Doe',
              phone: '555-0456',
              relationship: 'Mother'
            }
          })
        );
      });
    });

    it('should handle form submission errors', async () => {
      const errorMessage = 'Email already exists';
      mockMutation.mutate.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      render(<StudentForm />);

      await user.type(screen.getByLabelText(/student name/i), 'Test Student');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      // Error should be handled gracefully
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create student/i })).not.toBeDisabled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      mockMutation.isLoading = true;
      
      render(<StudentForm />);

      const submitButton = screen.getByRole('button', { name: /creating/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/creating/i);
    });

    it('should disable form fields during submission', () => {
      mockMutation.isLoading = true;

      render(<StudentForm />);

      expect(screen.getByLabelText(/student name/i)).toBeDisabled();
      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/phone number/i)).toBeDisabled();
      expect(screen.getByLabelText(/notes/i)).toBeDisabled();
    });
  });

  describe('Edit Mode', () => {
    it('should pre-populate fields with existing student data', () => {
      const studentData = createTestStudent();
      render(<StudentForm student={studentData} />);

      expect(screen.getByDisplayValue(studentData.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(studentData.email)).toBeInTheDocument();
      
      if (studentData.phone) {
        expect(screen.getByDisplayValue(studentData.phone)).toBeInTheDocument();
      }
      
      if (studentData.notes) {
        expect(screen.getByDisplayValue(studentData.notes)).toBeInTheDocument();
      }
    });

    it('should call update mutation in edit mode', async () => {
      const studentData = createTestStudent();
      render(<StudentForm student={studentData} />);

      const nameInput = screen.getByDisplayValue(studentData.name);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const submitButton = screen.getByRole('button', { name: /update student/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: studentData.id,
            name: 'Updated Name'
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<StudentForm />);

      expect(screen.getByLabelText(/student name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<StudentForm />);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label');

      const submitButton = screen.getByRole('button', { name: /create student/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should associate error messages with form fields', async () => {
      render(<StudentForm />);

      const submitButton = screen.getByRole('button', { name: /create student/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/student name/i);
        const errorMessage = screen.getByText(/name is required/i);
        
        expect(nameInput).toHaveAttribute('aria-describedby');
        expect(errorMessage).toHaveAttribute('id');
      });
    });
  });

  describe('Character Limits', () => {
    it('should show character count for limited fields', () => {
      render(<StudentForm />);

      const notesInput = screen.getByLabelText(/notes/i);
      expect(screen.getByText(/0 \/ 1000/)).toBeInTheDocument();
    });

    it('should update character count as user types', async () => {
      render(<StudentForm />);

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Test notes');

      expect(screen.getByText(/10 \/ 1000/)).toBeInTheDocument();
    });

    it('should warn when approaching character limit', async () => {
      render(<StudentForm />);

      const notesInput = screen.getByLabelText(/notes/i);
      const longText = 'a'.repeat(950); // Close to 1000 limit
      await user.type(notesInput, longText);

      expect(screen.getByText(/950 \/ 1000/)).toBeInTheDocument();
      expect(screen.getByText(/950 \/ 1000/)).toHaveClass('text-orange-600'); // Warning color
    });

    it('should show error when character limit exceeded', async () => {
      render(<StudentForm />);

      const notesInput = screen.getByLabelText(/notes/i);
      const tooLongText = 'a'.repeat(1001); // Exceeds 1000 limit
      await user.type(notesInput, tooLongText);

      expect(screen.getByText(/1001 \/ 1000/)).toBeInTheDocument();
      expect(screen.getByText(/1001 \/ 1000/)).toHaveClass('text-red-600'); // Error color
    });
  });
});