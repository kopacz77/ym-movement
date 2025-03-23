// src/components/ui/password-strength.tsx
"use client";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("bg-gray-200");

  useEffect(() => {
    calculateStrength(password);
  }, [password]);

  const calculateStrength = (password: string) => {
    // Initialize score
    let score = 0;

    // If no password, return 0
    if (!password) {
      setStrength(0);
      setMessage("");
      setColor("bg-gray-200");
      return;
    }

    // Add points for length
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;

    // Add points for complexity
    if (/[A-Z]/.test(password)) score += 15; // Uppercase letters
    if (/[a-z]/.test(password)) score += 15; // Lowercase letters
    if (/[0-9]/.test(password)) score += 15; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 15; // Special characters

    // Check for common patterns and subtract points
    if (/^[A-Za-z]+$/.test(password)) score -= 10; // Only letters
    if (/^[0-9]+$/.test(password)) score -= 10; // Only numbers
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters

    // Cap the score at 100
    score = Math.max(0, Math.min(100, score));

    // Set strength, message, and color based on score
    setStrength(score);

    if (score < 30) {
      setMessage("Weak");
      setColor("bg-red-500");
    } else if (score < 60) {
      setMessage("Fair");
      setColor("bg-yellow-500");
    } else if (score < 80) {
      setMessage("Good");
      setColor("bg-blue-500");
    } else {
      setMessage("Strong");
      setColor("bg-green-500");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span>Password Strength:</span>
        <span className="font-medium">{message}</span>
      </div>
      <Progress value={strength} className={`h-1.5 ${color}`} />
    </div>
  );
}
