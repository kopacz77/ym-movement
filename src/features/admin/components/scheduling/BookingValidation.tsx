import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';

interface ValidationResult {
  passed: boolean;
  message: string;
}

interface BookingValidationProps {
  studentId: string;
  timeSlotId: string;
  validations: ValidationResult[];
}

export const BookingValidation = ({ validations }: BookingValidationProps) => {
  return (
    <div className="space-y-4">
      {validations.map((validation, index) => (
        <Alert key={index} variant={validation.passed ? "default" : "destructive"}>
          {validation.passed ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {validation.passed ? "Validation Passed" : "Validation Failed"}
          </AlertTitle>
          <AlertDescription>{validation.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
