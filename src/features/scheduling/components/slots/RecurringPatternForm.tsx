// src/features/scheduling/components/scheduling/ConflictDetector.tsx
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '../../utils/validationUtils';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ConflictDetectorProps {
  validations: ValidationResult[];
  showAllValidations?: boolean;
}

export const ConflictDetector: React.FC<ConflictDetectorProps> = ({ validations, showAllValidations = false }) => {
  const getIcon = (severity: ValidationResult['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const filteredValidations = showAllValidations ? validations : validations.filter(v => !v.passed);

  if (filteredValidations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Validation Results
          <Badge variant={validations.some(v => !v.passed) ? "destructive" : "default"}>
            {validations.filter(v => !v.passed).length} Issues
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredValidations.map((validation, index) => (
          <Alert key={index} variant={validation.severity === 'error' ? "destructive" : "default"}>
            {getIcon(validation.severity)}
            <AlertTitle>
              {validation.severity === 'error' ? 'Error' : validation.severity === 'warning' ? 'Warning' : 'Info'}
            </AlertTitle>
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};
