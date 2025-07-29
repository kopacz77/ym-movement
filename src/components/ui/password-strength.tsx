// src/components/ui/password-strength.tsx
"use client";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthProps {
  password: string;
  showErrors?: boolean;
}

// Client-side password validation (matches server-side logic)
function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&)");
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "123456789",
    "qwerty",
    "abc123",
    "password123",
    "admin",
    "letmein",
    "welcome",
    "123456",
    "password1",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common and easily guessable");
  }

  // Calculate score (0-100)
  let score = 0;
  if (!password) return { isValid: false, errors, score: 0 };

  // Base points for length
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;

  // Points for character types
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[@$!%*?&]/.test(password)) score += 15;

  // Bonus points for longer passwords
  if (password.length >= 16) score += 10;

  // Deduct points for common patterns
  if (/(.)\1{2,}/.test(password)) score -= 15; // Repeated characters
  if (/^[A-Za-z]+$/.test(password)) score -= 10; // Only letters
  if (/^[0-9]+$/.test(password)) score -= 10; // Only numbers

  score = Math.max(0, Math.min(100, score));

  return {
    isValid: errors.length === 0,
    errors,
    score,
  };
}

export function PasswordStrength({ password, showErrors = false }: PasswordStrengthProps) {
  const [validation, setValidation] = useState({ isValid: false, errors: [], score: 0 });
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("bg-gray-200");

  useEffect(() => {
    const result = validatePasswordStrength(password);
    setValidation(result);
    updateDisplay(result.score, result.isValid);
  }, [password]);

  const updateDisplay = (score: number, isValid: boolean) => {
    if (score < 30) {
      setMessage("Weak");
      setColor("bg-red-500");
    } else if (score < 60) {
      setMessage("Fair");
      setColor("bg-yellow-500");
    } else if (score < 80) {
      setMessage("Good");
      setColor("bg-blue-500");
    } else if (isValid) {
      setMessage("Strong");
      setColor("bg-green-500");
    } else {
      setMessage("Needs work");
      setColor("bg-orange-500");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span>Password Strength:</span>
        <span className="font-medium">{message}</span>
      </div>
      <Progress value={validation.score} className={`h-1.5 ${color}`} />

      {showErrors && validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-xs text-red-600 flex items-center">
              <span className="mr-1">•</span>
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
