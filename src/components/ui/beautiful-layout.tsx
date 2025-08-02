"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

interface BeautifulPageContainerProps {
  children: React.ReactNode;
  className?: string;
  gradient?: "warm" | "love" | "professional" | "coaching";
}

export function BeautifulPageContainer({
  children,
  className,
  gradient = "warm",
}: BeautifulPageContainerProps) {
  const gradientStyles = {
    warm: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    love: "bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50",
    professional: "bg-gradient-to-br from-blue-50 via-slate-50 to-gray-50",
    coaching: "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50",
  };

  return (
    <div className={cn("min-h-screen w-full", gradientStyles[gradient], className)}>{children}</div>
  );
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg" | "xl";
}

export function Section({ children, className, spacing = "lg" }: SectionProps) {
  const spacingStyles = {
    sm: "space-y-4",
    md: "space-y-6",
    lg: "space-y-8",
    xl: "space-y-12",
  };

  return <section className={cn(spacingStyles[spacing], className)}>{children}</section>;
}

interface CardGridProps {
  children: React.ReactNode;
  columns?: "1" | "2" | "3" | "4";
  className?: string;
}

export function CardGrid({ children, columns = "3", className }: CardGridProps) {
  const columnStyles = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 md:grid-cols-2",
    "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={cn("grid gap-6", columnStyles[columns], className)}>{children}</div>;
}

interface BeautifulCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  shadow?: "none" | "default" | "large" | "xl";
  hover?: boolean;
}

export function BeautifulCard({
  children,
  className,
  gradient = false,
  shadow = "default",
  hover = true,
}: BeautifulCardProps) {
  const shadowStyles = {
    none: "",
    default: "shadow-sm",
    large: "shadow-lg",
    xl: "shadow-xl",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white",
        shadowStyles[shadow],
        gradient && "bg-gradient-to-br from-white to-slate-50",
        hover && "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        className,
      )}
    >
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 opacity-70" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function ActionBar({ children, className, gradient = true }: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 rounded-xl border",
        gradient && "bg-gradient-to-r from-slate-50 to-slate-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatsGrid({ children, className }: StatsGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <BeautifulCard className={cn("p-6", className)} gradient hover>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {icon && (
          <div className="flex items-center gap-2">
            {icon}
            {trend && (
              <div
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-green-600" : "text-red-600",
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
        )}
      </div>
    </BeautifulCard>
  );
}

interface ContentWrapperProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export function ContentWrapper({ children, maxWidth = "2xl", className }: ContentWrapperProps) {
  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-7xl",
  };

  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", maxWidthStyles[maxWidth], className)}>
      {children}
    </div>
  );
}

interface FloatingActionProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingAction({ children, className }: FloatingActionProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "bg-blue-600 hover:bg-blue-700 text-white",
        "rounded-full p-4 shadow-lg hover:shadow-xl",
        "transition-all duration-300 hover:scale-110",
        className,
      )}
    >
      {children}
    </div>
  );
}
