/**
 * Enhanced Type Safety Implementation
 *
 * Advanced TypeScript patterns for bulletproof type safety
 *
 * @version 3.0.0
 * @since Phase 3 Architecture Optimizations
 */

// Utility types for enhanced type safety
export type StrictExtract<T, U> = T extends U ? T : never;
export type NonNullable<T> = T extends null | undefined ? never : T;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Brand types for preventing mix-ups
export type Brand<T, B> = T & { __brand: B };

export type UserId = Brand<string, "UserId">;
export type StudentId = Brand<string, "StudentId">;
export type LessonId = Brand<string, "LessonId">;
export type PaymentId = Brand<string, "PaymentId">;
export type RinkId = Brand<string, "RinkId">;
export type TimeSlotId = Brand<string, "TimeSlotId">;

// Temporal types for time safety
export type ISODateString = Brand<string, "ISODateString">;
export type Timezone = Brand<string, "Timezone">;
export type UnixTimestamp = Brand<number, "UnixTimestamp">;

// Status enum types with exhaustive checking
export enum UserRole {
  ADMIN = "ADMIN",
  COACH = "COACH",
  STUDENT = "STUDENT",
}

export enum LessonStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  REFUNDED = "REFUNDED",
}

// Exhaustive type checking utility
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// Type guards with enhanced safety
export namespace TypeGuards {
  export function isUserId(value: string): value is UserId {
    return typeof value === "string" && value.length > 0 && value.startsWith("user_");
  }

  export function isStudentId(value: string): value is StudentId {
    return typeof value === "string" && value.length > 0 && value.startsWith("student_");
  }

  export function isLessonId(value: string): value is LessonId {
    return typeof value === "string" && value.length > 0 && value.startsWith("lesson_");
  }

  export function isPaymentId(value: string): value is PaymentId {
    return typeof value === "string" && value.length > 0 && value.startsWith("payment_");
  }

  export function isRinkId(value: string): value is RinkId {
    return typeof value === "string" && value.length > 0 && value.startsWith("rink_");
  }

  export function isISODateString(value: string): value is ISODateString {
    return typeof value === "string" && !isNaN(Date.parse(value));
  }

  export function isTimezone(value: string): value is Timezone {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  export function isUserRole(value: string): value is UserRole {
    return Object.values(UserRole).includes(value as UserRole);
  }

  export function isLessonStatus(value: string): value is LessonStatus {
    return Object.values(LessonStatus).includes(value as LessonStatus);
  }

  export function isPaymentStatus(value: string): value is PaymentStatus {
    return Object.values(PaymentStatus).includes(value as PaymentStatus);
  }

  export function isNonNullable<T>(value: T | null | undefined): value is NonNullable<T> {
    return value !== null && value !== undefined;
  }

  export function hasRequiredProperty<T, K extends keyof T>(
    obj: T,
    key: K,
  ): obj is T & Required<Pick<T, K>> {
    return obj[key] !== undefined && obj[key] !== null;
  }
}

// Factory functions with type safety
export namespace TypeFactories {
  export function createUserId(id: string): UserId {
    if (!TypeGuards.isUserId(id)) {
      throw new Error(`Invalid user ID format: ${id}`);
    }
    return id;
  }

  export function createStudentId(id: string): StudentId {
    if (!TypeGuards.isStudentId(id)) {
      throw new Error(`Invalid student ID format: ${id}`);
    }
    return id;
  }

  export function createLessonId(id: string): LessonId {
    if (!TypeGuards.isLessonId(id)) {
      throw new Error(`Invalid lesson ID format: ${id}`);
    }
    return id;
  }

  export function createPaymentId(id: string): PaymentId {
    if (!TypeGuards.isPaymentId(id)) {
      throw new Error(`Invalid payment ID format: ${id}`);
    }
    return id;
  }

  export function createRinkId(id: string): RinkId {
    if (!TypeGuards.isRinkId(id)) {
      throw new Error(`Invalid rink ID format: ${id}`);
    }
    return id;
  }

  export function createISODateString(date: Date | string): ISODateString {
    const isoString = date instanceof Date ? date.toISOString() : date;
    if (!TypeGuards.isISODateString(isoString)) {
      throw new Error(`Invalid ISO date string: ${isoString}`);
    }
    return isoString;
  }

  export function createTimezone(timezone: string): Timezone {
    if (!TypeGuards.isTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    return timezone as Timezone;
  }
}

// Strict entity interfaces with immutability
export interface StrictUser {
  readonly id: UserId;
  readonly email: string;
  readonly name: string | null;
  readonly role: UserRole;
  readonly emailVerified: ISODateString | null;
  readonly image: string | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface StrictStudent {
  readonly id: StudentId;
  readonly userId: UserId;
  readonly level: string;
  readonly dateOfBirth: ISODateString | null;
  readonly parentEmail: string | null;
  readonly parentPhone: string | null;
  readonly emergencyContact: string | null;
  readonly medicalInfo: string | null;
  readonly notes: string | null;
  readonly customPricing: number | null;
  readonly isApproved: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly user: StrictUser;
}

export interface StrictLesson {
  readonly id: LessonId;
  readonly studentId: StudentId;
  readonly rinkTimeSlotId: TimeSlotId;
  readonly type: string;
  readonly status: LessonStatus;
  readonly startTime: ISODateString;
  readonly endTime: ISODateString;
  readonly notes: string | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly student: StrictStudent;
}

export interface StrictPayment {
  readonly id: PaymentId;
  readonly studentId: StudentId;
  readonly lessonId: LessonId | null;
  readonly amount: number;
  readonly status: PaymentStatus;
  readonly method: string | null;
  readonly transactionId: string | null;
  readonly lesson_date: ISODateString;
  readonly dueDate: ISODateString;
  readonly paidAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly student: StrictStudent;
  readonly lesson: StrictLesson | null;
}

export interface StrictRink {
  readonly id: RinkId;
  readonly name: string;
  readonly address: string;
  readonly timezone: Timezone;
  readonly isActive: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface StrictTimeSlot {
  readonly id: TimeSlotId;
  readonly rinkId: RinkId;
  readonly date: ISODateString;
  readonly startTime: ISODateString;
  readonly endTime: ISODateString;
  readonly maxStudents: number;
  readonly isActive: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly rink: StrictRink;
  readonly lessons: readonly StrictLesson[];
}

// Result types for error handling
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export namespace ResultHelpers {
  export function success<T>(data: T): Result<T, never> {
    return { success: true, data };
  }

  export function failure<E>(error: E): Result<never, E> {
    return { success: false, error };
  }

  export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
    if (result.success) {
      return success(fn(result.data));
    }
    return result;
  }

  export function flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>,
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  }

  export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (result.success) {
      return result;
    }
    return failure(fn(result.error));
  }

  export function unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw result.error;
  }

  export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  }
}

// Validation types and utilities
export interface ValidationRule<T> {
  readonly predicate: (value: T) => boolean;
  readonly message: string;
}

export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export namespace Validators {
  export function required<T>(field: string): ValidationRule<T | null | undefined> {
    return {
      predicate: (value): value is NonNullable<T> => value !== null && value !== undefined,
      message: `${field} is required`,
    };
  }

  export function minLength(field: string, min: number): ValidationRule<string> {
    return {
      predicate: (value) => value.length >= min,
      message: `${field} must be at least ${min} characters`,
    };
  }

  export function maxLength(field: string, max: number): ValidationRule<string> {
    return {
      predicate: (value) => value.length <= max,
      message: `${field} must be at most ${max} characters`,
    };
  }

  export function email(field: string): ValidationRule<string> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      predicate: (value) => emailRegex.test(value),
      message: `${field} must be a valid email address`,
    };
  }

  export function positive(field: string): ValidationRule<number> {
    return {
      predicate: (value) => value > 0,
      message: `${field} must be positive`,
    };
  }

  export function inRange(field: string, min: number, max: number): ValidationRule<number> {
    return {
      predicate: (value) => value >= min && value <= max,
      message: `${field} must be between ${min} and ${max}`,
    };
  }

  export function oneOf<T>(field: string, allowedValues: readonly T[]): ValidationRule<T> {
    return {
      predicate: (value) => allowedValues.includes(value),
      message: `${field} must be one of: ${allowedValues.join(", ")}`,
    };
  }

  export function validate<T>(
    value: T,
    field: string,
    rules: readonly ValidationRule<T>[],
  ): Result<T, ValidationError> {
    for (const rule of rules) {
      if (!rule.predicate(value)) {
        return ResultHelpers.failure(new ValidationError(field, value, rule.message));
      }
    }
    return ResultHelpers.success(value);
  }

  export function validateObject<T extends Record<string, any>>(
    obj: T,
    schema: {
      readonly [K in keyof T]: readonly ValidationRule<T[K]>[];
    },
  ): Result<T, ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = obj[field];
      const result = validate(value, field, rules as ValidationRule<any>[]);

      if (!result.success) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return ResultHelpers.failure(errors);
    }

    return ResultHelpers.success(obj);
  }
}

// API response types with strict typing
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: ISODateString;
  readonly requestId: string;
}

export interface PaginatedResponse<T>
  extends ApiResponse<{
    readonly items: readonly T[];
    readonly pagination: {
      readonly page: number;
      readonly limit: number;
      readonly total: number;
      readonly totalPages: number;
      readonly hasNext: boolean;
      readonly hasPrev: boolean;
    };
  }> {}

// Event types for type-safe event handling
export interface DomainEvent<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: ISODateString;
  readonly aggregateId: string;
  readonly version: number;
}

export interface StudentCreatedEvent
  extends DomainEvent<{
    readonly studentId: StudentId;
    readonly userId: UserId;
    readonly level: string;
    readonly isApproved: boolean;
  }> {
  readonly type: "student.created";
}

export interface LessonBookedEvent
  extends DomainEvent<{
    readonly lessonId: LessonId;
    readonly studentId: StudentId;
    readonly timeSlotId: TimeSlotId;
    readonly startTime: ISODateString;
    readonly endTime: ISODateString;
  }> {
  readonly type: "lesson.booked";
}

export interface PaymentProcessedEvent
  extends DomainEvent<{
    readonly paymentId: PaymentId;
    readonly studentId: StudentId;
    readonly amount: number;
    readonly status: PaymentStatus;
    readonly method: string;
  }> {
  readonly type: "payment.processed";
}

export type SystemEvent = StudentCreatedEvent | LessonBookedEvent | PaymentProcessedEvent;

// Type-safe environment configuration
export interface EnvironmentConfig {
  readonly NODE_ENV: "development" | "production" | "test";
  readonly DATABASE_URL: string;
  readonly NEXTAUTH_SECRET: string;
  readonly NEXTAUTH_URL: string;
  readonly REDIS_HOST?: string;
  readonly REDIS_PORT?: string;
  readonly REDIS_PASSWORD?: string;
  readonly GOOGLE_CLIENT_EMAIL?: string;
  readonly GOOGLE_PRIVATE_KEY?: string;
  readonly GOOGLE_CALENDAR_ID?: string;
}

export function validateEnvironment(): Result<EnvironmentConfig, string[]> {
  const errors: string[] = [];
  const env = process.env;

  const requiredVars = ["NODE_ENV", "DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"] as const;

  for (const varName of requiredVars) {
    if (!env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  if (env.NODE_ENV && !["development", "production", "test"].includes(env.NODE_ENV)) {
    errors.push(`Invalid NODE_ENV: ${env.NODE_ENV}`);
  }

  if (errors.length > 0) {
    return ResultHelpers.failure(errors);
  }

  return ResultHelpers.success(env as EnvironmentConfig);
}

// Export all type utilities
export { TypeGuards, TypeFactories, ResultHelpers, Validators, ValidationError, assertNever };

// Types are already exported above - no need for re-export
