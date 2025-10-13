import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate: () => Promise<ValidationResult>;
  severity: "ERROR" | "WARNING" | "INFO";
}

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

export const ScheduleValidation = () => {
  const [validationResults, _setValidationResults] = React.useState<
    Record<string, ValidationResult>
  >({});

  const rules: ValidationRule[] = [
    {
      id: "student-limit",
      name: "Student Limit Check",
      description: "Verify student has not exceeded weekly lesson limit",
      severity: "ERROR",
      validate: async () => ({
        passed: true,
        message: "Student is within weekly lesson limit",
      }),
    },
    {
      id: "time-slot-availability",
      name: "Time Slot Availability",
      description: "Check if the selected time slot is available",
      severity: "ERROR",
      validate: async () => ({
        passed: true,
        message: "Time slot is available",
      }),
    },
    // Add more validation rules
  ];

  const getValidationIcon = (result: ValidationResult, severity: string) => {
    if (result.passed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return severity === "ERROR" ? (
      <XCircle className="h-5 w-5 text-red-500" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-yellow-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Validation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rules.map((rule) => {
            const result = validationResults[rule.id];
            return (
              <div key={rule.id} className="p-4 border rounded-lg flex items-start gap-4">
                {result && getValidationIcon(result, rule.severity)}
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-gray-500">{rule.description}</p>
                  {result && (
                    <p
                      className={`mt-2 text-sm ${
                        result.passed ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
