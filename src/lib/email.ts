// Streamlined src/lib/email.ts

import { DateTime } from "luxon";
import { Resend } from "resend";
import { REGISTRATION_TOKEN_EXPIRY_HOURS } from "@/lib/auth-tokens";

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_BASE_URL = "https://ym-movement.com";

/**
 * Resolve the public base URL used to build links in outgoing emails.
 *
 * Priority: NEXT_PUBLIC_BASE_URL → NEXTAUTH_URL → hardcoded production URL.
 *
 * VERCEL_URL / NETLIFY_URL are deliberately NOT consulted — they are scheme-less
 * hostnames pointing at preview deployments that sit behind platform auth walls,
 * which silently broke student-approval links on 2026-04-23 until this was fixed.
 *
 * The returned URL is always scheme-prefixed and has no trailing slash, so callers
 * can safely do `${resolveBaseUrl()}/path`.
 */
export function resolveBaseUrl(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): string {
  const candidate = firstNonEmpty(env.NEXT_PUBLIC_BASE_URL, env.NEXTAUTH_URL) ?? DEFAULT_BASE_URL;
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  return withScheme.replace(/\/+$/, "");
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim() !== "") {
      return v.trim();
    }
  }
  return undefined;
}

// Legacy module-level reference, resolved at module load. Prefer calling resolveBaseUrl()
// directly inside email builders so runtime env changes (and tests) take effect.
const BASE_URL = resolveBaseUrl();

// Email configuration constants
const EMAIL_CONFIG = {
  from: "YM Movement <info@ym-movement.com>",
  replyTo: "info@ym-movement.com",
};

/**
 * Send an email via Resend. Throws on any failure so callers can detect and surface it.
 *
 * In non-production environments, a missing RESEND_API_KEY is treated as a dev-convenience
 * no-op (returns a mock id, logs a warning). In production, a missing key throws — silent
 * misconfiguration was the root cause of a 15-day email outage on 2026-04-21.
 */
async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey || !resend) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEV] RESEND_API_KEY not set — would have sent "${subject}" to ${to}`);
      return { id: "mock-email-id-dev" };
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { data, error } = await resend.emails.send({
    ...EMAIL_CONFIG,
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`Resend error sending "${subject}" to ${to}:`, error);
    throw new Error(`Resend: ${error.message}`);
  }

  return data;
}

/**
 * Formats a date to a readable string in the specified timezone (e.g., "Monday, January 1, 2025")
 */
function formatDate(date: Date, timezone: string): string {
  try {
    const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(timezone);

    if (!dt.isValid) {
      console.error("Invalid date for formatDate:", date, "timezone:", timezone);
      return "Invalid date";
    }

    return dt.toFormat("EEEE, MMMM d, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return date.toLocaleDateString();
  }
}

/**
 * Formats time to a readable string in the specified timezone (e.g., "7:30 AM")
 */
function formatTime(date: Date, timezone: string): string {
  try {
    const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(timezone);

    if (!dt.isValid) {
      console.error("Invalid date for formatTime:", date, "timezone:", timezone);
      return "Invalid time";
    }

    return dt.toFormat("h:mm a");
  } catch (error) {
    console.error("Error formatting time:", error);
    return date.toLocaleTimeString();
  }
}

/**
 * Formats a time for Google Calendar in the specified timezone
 */
function formatRawTimeForCalendar(date: Date, timezone: string): string {
  try {
    // FIXED: Don't assume the date is in UTC, let Luxon handle the conversion properly
    const dt = DateTime.fromJSDate(date).setZone(timezone);

    if (!dt.isValid) {
      console.error("Invalid date for formatRawTimeForCalendar:", date, "timezone:", timezone);
      return "";
    }

    return dt.toFormat("yyyyMMdd'T'HHmmss");
  } catch (error) {
    console.error("Error formatting time for calendar:", error);
    return "";
  }
}

/**
 * Sends a welcome email to a new student
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Registration Received!</h1>
      <p>Hello ${name},</p>
      <p>Thank you for your interest in YM Movement. We've received your registration and are excited about the possibility of having you join us!</p>
      <p><strong>What happens next:</strong></p>
      <ul style="margin-left: 20px;">
        <li>Our administrators will review your registration</li>
        <li>Once approved, you'll receive an email to complete your account setup</li>
        <li>You'll create your password and finalize your profile</li>
        <li>Then you can start booking ice dance lessons!</li>
      </ul>
      <p>If you have any questions while waiting for approval, please don't hesitate to contact us at info@ym-movement.com.</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
        <p style="margin: 0; font-weight: bold;">Your registration details:</p>
        <p style="margin: 5px 0;">Email: ${email}</p>
        <p style="margin: 5px 0;">Name: ${name}</p>
      </div>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Registration Received - YM Movement", emailContent);
}

/**
 * Notifies the admin that a new student has signed up and is waiting for approval.
 *
 * Returns `{ sent: false }` (instead of throwing) when no admin address is configured,
 * so sign-up never fails just because a dev env is missing the env var. In production,
 * missing `ADMIN_NOTIFICATION_EMAIL` / `INSTRUCTOR_EMAIL` is logged as an error — the
 * student still gets their welcome email and the record is still created.
 */
export async function sendAdminSignupNotification(student: {
  name: string;
  email: string;
  level: string;
  phone?: string | null;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.INSTRUCTOR_EMAIL ||
    "";

  if (!adminEmail) {
    const reason = "ADMIN_NOTIFICATION_EMAIL / INSTRUCTOR_EMAIL not configured";
    if (process.env.NODE_ENV === "production") {
      console.error(`Admin signup notification skipped: ${reason}`);
    }
    return { sent: false, skippedReason: reason };
  }

  const approvalsUrl = `${resolveBaseUrl()}/admin/pending-approvals`;
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">New student signup awaiting approval</h1>
      <p>A new student has submitted a registration on YM Movement and is waiting for your review.</p>

      <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
        <p style="margin: 5px 0;"><strong>Name:</strong> ${student.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${student.email}</p>
        <p style="margin: 5px 0;"><strong>Skating level:</strong> ${student.level.replace(/_/g, " ")}</p>
        ${student.phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${student.phone}</p>` : ""}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${approvalsUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review in admin dashboard</a>
      </div>

      <p style="color: #6b7280; font-size: 13px;">This is an automated notification — reply to this message to reach the student directly.</p>
    </div>
  `;

  await sendEmail(adminEmail, `New signup: ${student.name} (${student.level.replace(/_/g, " ")})`, emailContent);
  return { sent: true };
}

/**
 * Sends an approval notification email to a student with registration completion link
 */
export async function sendApprovalEmail(email: string, name: string, token: string) {
  const registrationUrl = `${BASE_URL}/auth/complete-registration?token=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">🎉 Registration Approved!</h1>
      <p>Hello ${name},</p>
      <p>Fantastic news! Your YM Movement registration has been approved by our administrators!</p>
      <p><strong>Next Step:</strong> Complete your account setup by creating your password and finalizing your profile.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${registrationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Complete Account Setup</a>
      </div>
      
      <p style="margin-top: 20px;">During account setup, you'll:</p>
      <ul style="margin-left: 20px; color: #374151;">
        <li><strong>Create your secure password</strong> - This will be your login password</li>
        <li><strong>Complete your profile</strong> - Add any additional details</li>
        <li><strong>Review your information</strong> - Make sure everything is correct</li>
      </ul>
      
      <p style="margin-top: 20px;">Once setup is complete, you'll have full access to:</p>
      <ul style="margin-left: 20px; color: #059669;">
        <li>📅 <strong>Book ice dance lessons</strong> with available time slots</li>
        <li>🏆 <strong>Track your progress</strong> and lesson history</li>
        <li>💳 <strong>Manage payments</strong> via Venmo, Zelle, or Cash</li>
        <li>⚙️ <strong>Update account settings</strong> and preferences</li>
      </ul>
      
      <div style="margin-top: 25px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>⏰ Important:</strong> This setup link expires in ${REGISTRATION_TOKEN_EXPIRY_HOURS} hours. Please complete your registration soon!</p>
      </div>
      
      <div style="margin-top: 25px; padding: 15px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #047857;"><strong>🎯 Ready to Start:</strong> After setup, you can immediately begin booking lessons and start your skating journey with us!</p>
      </div>
      
      <p style="margin-top: 20px;">We're thrilled to welcome you to the YM Movement family!</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "🎉 Registration Approved - Set Up Your Account", emailContent);
}

/**
 * Sends a lesson confirmation email to a student
 */
export async function sendLessonConfirmationEmail(
  studentEmail: string,
  studentName: string,
  lessonData: {
    startTime: Date;
    endTime: Date;
    type: string;
    rinkName: string;
    rinkAddress: string;
    rinkTimezone: string;
  },
  paymentMethod: string,
  referenceCode: string,
) {
  //console.log(`[EMAIL] Sending lesson confirmation to ${studentEmail}`);

  const duration = Math.round(
    (lessonData.endTime.getTime() - lessonData.startTime.getTime()) / (1000 * 60),
  );

  // Format calendar times in the rink timezone
  const startTimeForCal = formatRawTimeForCalendar(lessonData.startTime, lessonData.rinkTimezone);
  const endTimeForCal = formatRawTimeForCalendar(lessonData.endTime, lessonData.rinkTimezone);

  // Generate Google Calendar link with proper timezone
  const googleCalendarLink = `https://calendar.google.com/calendar/event?action=TEMPLATE&ctz=${encodeURIComponent(
    lessonData.rinkTimezone,
  )}&dates=${startTimeForCal}/${endTimeForCal}&text=${encodeURIComponent(
    `Ice Dance Lesson: ${studentName}`,
  )}&location=${encodeURIComponent(lessonData.rinkAddress)}&details=${encodeURIComponent(
    `Student: ${studentName} (${studentEmail})\\nLocation: ${lessonData.rinkName}\\nAddress: ${
      lessonData.rinkAddress
    }\\nDuration: ${duration === 60 ? "1 hour" : "30 minutes"}`,
  )}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Your ${duration === 60 ? "1-Hour" : "30-Minute"} Lesson is Confirmed!</h1>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">Lesson Details</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;">📅 <strong>Date:</strong> ${formatDate(
            lessonData.startTime,
            lessonData.rinkTimezone,
          )}</li>
          <li style="margin-bottom: 10px;">⏰ <strong>Time:</strong> ${formatTime(
            lessonData.startTime,
            lessonData.rinkTimezone,
          )} - ${formatTime(lessonData.endTime, lessonData.rinkTimezone)}</li>
          <li style="margin-bottom: 10px;">📍 <strong>Location:</strong> ${lessonData.rinkName}</li>
          <li style="margin-bottom: 10px;">📝 <strong>Address:</strong> ${lessonData.rinkAddress}</li>
          <li style="margin-bottom: 10px;">⏱️ <strong>Duration:</strong> ${
            duration === 60 ? "1 hour" : "30 minutes"
          }</li>
          <li style="margin-bottom: 10px;">🏆 <strong>Lesson Type:</strong> ${lessonData.type}</li>
        </ul>
      </div>

      <div style="background-color: #e8f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">Payment Information</h2>
        <p style="margin-bottom: 15px;">💳 <strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
        
        ${
          paymentMethod.toLowerCase() === "venmo"
            ? `<p style="margin-bottom: 15px;"><strong>Venmo:</strong> @yura-min</p>`
            : paymentMethod.toLowerCase() === "zelle"
              ? `<p style="margin-bottom: 15px;"><strong>Zelle:</strong> 714-743-7071</p>`
              : `<p style="margin-bottom: 15px;"><strong>Cash:</strong> Cash payment accepted - please bring exact amount to your lesson.</p>`
        }
        
        <div style="background-color: #fff; padding: 15px; border-radius: 4px; margin-top: 10px;">
          <p style="margin: 0; font-size: 14px;">⚠️ <strong>Important:</strong> Please include this reference in your payment note:</p>
          <p style="font-size: 18px; font-weight: bold; margin: 10px 0; color: #0066cc;">${referenceCode}</p>
        </div>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">Cancellation Policy</h2>
        <p style="margin-bottom: 10px;">Please note that lessons must be cancelled at least 24 hours in advance.</p>
        <p style="margin-bottom: 10px;">To cancel or reschedule, please visit your student dashboard or contact us directly at info@ym-movement.com.</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${googleCalendarLink}" 
           style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Add to Google Calendar
        </a>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${BASE_URL}/student/schedule" 
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Your Schedule
        </a>
      </div>
    </div>
  `;

  return sendEmail(
    studentEmail,
    `Lesson Confirmation: Ice Dance Lesson with ${studentName}`,
    emailContent,
  );
}

/**
 * Sends a password reset email to a user
 */
export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Reset Your Password</h1>
      <p>Hello ${name || "there"},</p>
      <p>We received a request to reset your password for your YM Movement account.</p>
      <p>Please click the button below to set a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Reset Password</a>
      <p style="margin-top: 20px; color: #666;">This link will expire in ${REGISTRATION_TOKEN_EXPIRY_HOURS} hours. If you didn't request a password reset, you can safely ignore this email.</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Reset Your YM Movement Password", emailContent);
}

/**
 * Sends an invitation email to a new user created by an admin
 */
export async function sendInvitationEmail(email: string, name: string, token: string) {
  const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}&invite=true`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Welcome to YM Movement!</h1>
      <p>Hello ${name || "there"},</p>
      <p>An account has been created for you on the YM Movement platform.</p>
      <p>Please click the button below to set your password and complete your registration:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Complete Registration</a>
      <p style="margin-top: 20px; color: #666;">This link will expire in ${REGISTRATION_TOKEN_EXPIRY_HOURS} hours.</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Welcome to YM Movement - Complete Your Registration", emailContent);
}

/**
 * Sends a payment reminder email to a student for an outstanding payment
 */
export async function sendPaymentReminderEmail(
  studentEmail: string,
  studentName: string,
  paymentDetails: {
    amount: number;
    referenceCode: string;
    dueDate: Date;
    lessonDate?: Date;
    lessonType?: string;
    paymentMethod: string;
  },
) {
  const paymentInstructions =
    paymentDetails.paymentMethod.toLowerCase() === "venmo"
      ? {
          method: "Venmo",
          details: "@yura-min",
          instructions: "Send payment to @yura-min via Venmo",
        }
      : paymentDetails.paymentMethod.toLowerCase() === "zelle"
        ? {
            method: "Zelle",
            details: "(714) 743-7071",
            instructions: "Send payment to (714) 743-7071 via Zelle",
          }
        : {
            method: "Cash",
            details: "In person",
            instructions: "Please bring cash payment to your next lesson",
          };

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #e11d48;">💳 Payment Reminder</h1>
      <p>Hello ${studentName},</p>
      <p>This is a friendly reminder that you have an outstanding payment for your recent lesson at YM Movement.</p>
      
      <div style="background-color: #fee2e2; border-left: 4px solid #e11d48; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h2 style="color: #991b1b; margin-top: 0;">Payment Details</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 8px;">💰 <strong>Amount Due:</strong> $${paymentDetails.amount.toFixed(2)}</li>
          ${paymentDetails.lessonDate ? `<li style="margin-bottom: 8px;">📅 <strong>Lesson Date:</strong> ${formatDate(paymentDetails.lessonDate, "America/Los_Angeles")}</li>` : ""}
          ${paymentDetails.lessonType ? `<li style="margin-bottom: 8px;">🏆 <strong>Lesson Type:</strong> ${paymentDetails.lessonType}</li>` : ""}
          <li style="margin-bottom: 8px;">⏰ <strong>Due Date:</strong> ${formatDate(paymentDetails.dueDate, "America/Los_Angeles")}</li>
        </ul>
      </div>

      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h2 style="color: #0c4a6e; margin-top: 0;">How to Pay</h2>
        <p style="margin-bottom: 15px;">💳 <strong>Payment Method:</strong> ${paymentInstructions.method}</p>
        <p style="margin-bottom: 15px;"><strong>${paymentInstructions.method}:</strong> ${paymentInstructions.details}</p>
        
        <div style="background-color: #fff; padding: 15px; border-radius: 4px; margin-top: 15px;">
          <p style="margin: 0; font-size: 14px;">⚠️ <strong>Important:</strong> Please include this reference code in your payment note:</p>
          <p style="font-size: 20px; font-weight: bold; margin: 10px 0; color: #0066cc; background-color: #f8f9fa; padding: 8px; border-radius: 4px; text-align: center;">${paymentDetails.referenceCode}</p>
        </div>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Need Help?</h3>
        <p style="margin-bottom: 10px;">If you have any questions about this payment or need to discuss payment arrangements, please don't hesitate to contact us:</p>
        <p style="margin-bottom: 10px;">📧 Email: info@ym-movement.com</p>
        <p style="margin-bottom: 10px;">📱 Text/Call: (714) 743-7071</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${BASE_URL}/student/payments" 
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Payment Details
        </a>
      </div>

      <p style="margin-top: 30px;">Thank you for your prompt attention to this matter. We appreciate your business and look forward to seeing you at your next lesson!</p>
      
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated reminder. Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  return sendEmail(
    studentEmail,
    `💳 Payment Reminder - $${paymentDetails.amount.toFixed(2)} Due`,
    emailContent,
  );
}

/**
 * Sends a generic notification email to a student when schedule changes have been made
 * This is called once per day for students who have pending email notifications
 */
export async function sendScheduleChangesEmail(
  studentEmail: string,
  studentName: string,
  changeCount: number,
) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">📅 Schedule Update</h1>
      <p>Hello ${studentName},</p>
      <p>Changes have been made to your schedule. Please log in to the YM Movement platform to review your updated schedule.</p>

      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; color: #0c4a6e;">
          <strong>Action Required:</strong> Please check your schedule on the YM Movement app to see the updates.
        </p>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${BASE_URL}/student/schedule"
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px;">
            Check Your Schedule
        </a>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #374151; margin-top: 0;">Need Help?</h3>
        <p style="margin-bottom: 10px;">If you have any questions about your schedule, please contact us:</p>
        <p style="margin-bottom: 8px;">📧 Email: info@ym-movement.com</p>
        <p style="margin-bottom: 8px;">📱 Text/Call: (714) 743-7071</p>
      </div>

      <p style="margin-top: 30px;">Thank you for choosing YM Movement!</p>

      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">You receive this email only when changes are made to your schedule.</p>
        <p style="margin: 5px 0 0 0;">To discuss your schedule or this notification, please contact us at info@ym-movement.com</p>
      </div>
    </div>
  `;

  return sendEmail(studentEmail, "Schedule Update - Please Check YM Movement App", emailContent);
}

/**
 * Sends a welcome receipt email to a coach who self-applied via /auth/coach-signup.
 * Confirms we received their application while they wait for admin review.
 */
export async function sendCoachWelcomeEmail(email: string, name: string) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Thanks for applying to coach with YM Movement</h1>
      <p>Hello ${name || "there"},</p>
      <p>We've received your coaching application and appreciate your interest in joining the YM Movement team.</p>
      <p><strong>What happens next:</strong></p>
      <ul style="margin-left: 20px;">
        <li>Our team will review your background, skills, and certifications</li>
        <li>Once approved, you'll receive an email with a link to finish setting up your coach account</li>
        <li>After completing setup, you'll be able to manage your schedule, students, and lessons</li>
      </ul>
      <p>If you have any questions while your application is being reviewed, feel free to reach out at info@ym-movement.com.</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
        <p style="margin: 0; font-weight: bold;">Your application details:</p>
        <p style="margin: 5px 0;">Name: ${name}</p>
        <p style="margin: 5px 0;">Email: ${email}</p>
      </div>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Coaching Application Received - YM Movement", emailContent);
}

/**
 * Sends an invitation email to a coach created directly by an admin via "Add New Coach".
 * Contains the registration-completion link so the coach can set their password.
 */
export async function sendCoachInvitationEmail(email: string, name: string, token: string) {
  const registrationUrl = `${BASE_URL}/auth/complete-registration?token=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Welcome to YM Movement</h1>
      <p>Hello ${name || "there"},</p>
      <p>A coach account has been created for you on the YM Movement platform. We're excited to have you on the team.</p>
      <p><strong>Next step:</strong> Set your password and complete your account setup.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${registrationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Set Up Your Coach Account</a>
      </div>

      <p style="margin-top: 20px;">Once your account is active, you'll be able to:</p>
      <ul style="margin-left: 20px; color: #374151;">
        <li>Manage your teaching schedule and available time slots</li>
        <li>View and manage your assigned students</li>
        <li>Track lessons, payments, and earnings</li>
        <li>Update your bio, skills, and certifications</li>
      </ul>

      <div style="margin-top: 25px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Heads up:</strong> This setup link expires in ${REGISTRATION_TOKEN_EXPIRY_HOURS} hours. If it expires before you use it, contact us at info@ym-movement.com and we'll send a new one.</p>
      </div>

      <p style="margin-top: 20px;">If you weren't expecting this invitation, you can safely ignore it.</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Welcome to YM Movement - Set Up Your Coach Account", emailContent);
}

/**
 * Sends an approval email to a self-applied coach once an admin approves their application.
 * Contains the registration-completion link so the coach can set their password.
 */
export async function sendCoachApprovalEmail(email: string, name: string, token: string) {
  const registrationUrl = `${BASE_URL}/auth/complete-registration?token=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Your coach application has been approved</h1>
      <p>Hello ${name || "there"},</p>
      <p>Great news — your coaching application has been approved by the YM Movement team.</p>
      <p><strong>Next step:</strong> Set your password and finish setting up your coach account.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${registrationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Complete Account Setup</a>
      </div>

      <p style="margin-top: 20px;">Once your account is active, you'll be able to:</p>
      <ul style="margin-left: 20px; color: #374151;">
        <li>Manage your teaching schedule and available time slots</li>
        <li>View and manage your assigned students</li>
        <li>Track lessons, payments, and earnings</li>
        <li>Update your bio, skills, and certifications</li>
      </ul>

      <div style="margin-top: 25px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Heads up:</strong> This setup link expires in ${REGISTRATION_TOKEN_EXPIRY_HOURS} hours. If it expires, reach out at info@ym-movement.com and we'll send a new one.</p>
      </div>

      <p style="margin-top: 20px;">Welcome to the team.</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Your YM Movement Coach Application is Approved", emailContent);
}
