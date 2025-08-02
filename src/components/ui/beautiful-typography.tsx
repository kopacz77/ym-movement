"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

interface HeroHeadingProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function HeroHeading({ children, className, gradient = true }: HeroHeadingProps) {
  return (
    <h1
      className={cn(
        "text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight",
        gradient &&
          "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent",
        !gradient && "text-foreground",
        className,
      )}
    >
      {children}
    </h1>
  );
}

interface PageHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function PageHeading({ children, className }: PageHeadingProps) {
  return (
    <h1 className={cn("text-3xl font-bold tracking-tight text-foreground", className)}>
      {children}
    </h1>
  );
}

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
  level?: "h2" | "h3" | "h4";
}

export function SectionHeading({ children, className, level = "h2" }: SectionHeadingProps) {
  const Component = level;
  const sizeStyles = {
    h2: "text-2xl md:text-3xl font-bold",
    h3: "text-xl md:text-2xl font-semibold",
    h4: "text-lg md:text-xl font-semibold",
  };

  return (
    <Component className={cn(sizeStyles[level], "tracking-tight text-foreground", className)}>
      {children}
    </Component>
  );
}

interface BodyTextProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "base" | "lg";
  muted?: boolean;
}

export function BodyText({ children, className, size = "base", muted = false }: BodyTextProps) {
  const sizeStyles = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  };

  return (
    <p
      className={cn(
        sizeStyles[size],
        "leading-relaxed",
        muted ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: "blue" | "purple" | "pink" | "green" | "orange" | "rainbow";
}

export function GradientText({ children, className, gradient = "blue" }: GradientTextProps) {
  const gradientStyles = {
    blue: "bg-gradient-to-r from-blue-600 to-blue-800",
    purple: "bg-gradient-to-r from-purple-600 to-purple-800",
    pink: "bg-gradient-to-r from-pink-600 to-purple-600",
    green: "bg-gradient-to-r from-green-600 to-emerald-600",
    orange: "bg-gradient-to-r from-orange-600 to-red-600",
    rainbow: "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600",
  };

  return (
    <span
      className={cn(
        gradientStyles[gradient],
        "bg-clip-text text-transparent font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SubtleTextProps {
  children: React.ReactNode;
  className?: string;
}

export function SubtleText({ children, className }: SubtleTextProps) {
  return <span className={cn("text-sm text-muted-foreground", className)}>{children}</span>;
}

interface AccentTextProps {
  children: React.ReactNode;
  className?: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
}

export function AccentText({ children, className, color = "blue" }: AccentTextProps) {
  const colorStyles = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600",
  };

  return <span className={cn(colorStyles[color], "font-medium", className)}>{children}</span>;
}

interface CoachingQuoteProps {
  children: React.ReactNode;
  author?: string;
  className?: string;
}

export function CoachingQuote({ children, author, className }: CoachingQuoteProps) {
  return (
    <blockquote
      className={cn(
        "relative border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 italic",
        "before:content-['\"'] before:text-4xl before:text-blue-500 before:font-bold before:absolute before:-top-2 before:-left-1",
        "after:content-['\"'] after:text-4xl after:text-blue-500 after:font-bold after:absolute after:-bottom-6 after:-right-1",
        className,
      )}
    >
      <p className="text-lg leading-relaxed text-gray-700 mb-3">{children}</p>
      {author && <cite className="text-sm font-medium text-gray-600 not-italic">— {author}</cite>}
    </blockquote>
  );
}

interface LabelProps {
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function Label({ children, className, required }: LabelProps) {
  return (
    <label className={cn("text-sm font-medium text-foreground", className)}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

interface BadgeTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export function BadgeText({ children, className, variant = "default" }: BadgeTextProps) {
  const variantStyles = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface CodeTextProps {
  children: React.ReactNode;
  className?: string;
}

export function CodeText({ children, className }: CodeTextProps) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className,
      )}
    >
      {children}
    </code>
  );
}
