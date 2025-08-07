// Streamlined src/lib/email.ts
import { Resend } from "resend";

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Get the base URL with fallbacks for different hosting environments
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL ||
  process.env.NETLIFY_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ym-movement.com";

// Email configuration constants
const EMAIL_CONFIG = {
  from: "YM Movement <info@ym-movement.com>",
  replyTo: "info@ym-movement.com",
};

/**
 * Helper function to send an email with error handling and fallback
 */
async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!resendApiKey || !resend) {
      //console.warn("RESEND_API_KEY not found, using fallback email method");
      //console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      //console.log(`[MOCK EMAIL] Content: ${html}`);
      return { id: "mock-email-id" };
    }

    const { data, error } = await resend.emails.send({
      ...EMAIL_CONFIG,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`Error sending email (${subject}):`, error);
      // In development, don't throw - just log and return mock response
      if (process.env.NODE_ENV === "development") {
        console.warn(`[DEV MODE] Email sending failed, continuing without error`);
        return { id: "mock-email-id-dev-fallback" };
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }

    //console.log(`Email sent successfully (${subject}):`, data);
    return data;
  } catch (error) {
    console.error(`Exception sending email (${subject}):`, error);
    return { id: "error-fallback", error };
  }
}

/**
 * Formats a date to a readable string (e.g., "Monday, January 1, 2025")
 */
function formatDate(date: Date): string {
  // Get the date components directly from the UTC fields
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const weekday = date.getUTCDay();

  // Create array for display
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return `${days[weekday]}, ${months[month]} ${day}, ${year}`;
}

/**
 * Formats time to a readable string (e.g., "7:30 AM")
 * Treats UTC time fields directly as local time (no conversion)
 */
function formatTime(date: Date): string {
  // Get UTC hours and minutes but treat them as local time
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  // Format in AM/PM
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12; // Convert 0 to 12

  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Formats a raw UTC time for Google Calendar, treating UTC fields as local time
 * This function ensures that 7:30 UTC becomes 7:30 in the calendar
 */
function formatRawTimeForCalendar(date: Date): string {
  // Extract the UTC components
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");

  // Create a string that looks like 20250330T073000 (for Mar 30, 2025, 7:30 AM)
  return `${year}${month}${day}T${hours}${minutes}00`;
}

/**
 * Sends a welcome email to a new student
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Welcome to YM Movement!</h1>
      <p>Hello ${name},</p>
      <p>Thank you for registering with YM Movement. We're excited to have you join us!</p>
      <p>Your account has been created and is currently pending approval by our administrators. You'll receive another email once your account has been approved.</p>
      <p>In the meantime, if you have any questions, please don't hesitate to contact us at info@ym-movement.com.</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
        <p style="margin: 0; font-weight: bold;">Your account details:</p>
        <p style="margin: 5px 0;">Email: ${email}</p>
      </div>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Welcome to YM Movement", emailContent);
}

/**
 * Sends an approval notification email to a student with registration completion link
 */
export async function sendApprovalEmail(email: string, name: string, token: string) {
  const registrationUrl = `${BASE_URL}/auth/complete-registration?token=${token}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">🎉 Account Approved!</h1>
      <p>Hello ${name},</p>
      <p>Great news! Your YM Movement account has been approved and you're ready to get started!</p>
      <p>To complete your registration, please click the button below to finish setting up your account:</p>
      <a href="${registrationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold;">Complete Your Registration</a>
      
      <p style="margin-top: 20px;">During registration completion, you'll:</p>
      <ul style="margin-left: 20px;">
        <li>Complete your profile information</li>
        <li>Create a secure password</li>
        <li>Set up your account preferences</li>
      </ul>
      
      <p style="margin-top: 20px;">Once your registration is complete, you'll be able to:</p>
      <ul style="margin-left: 20px;">
        <li>Schedule ice dance lessons</li>
        <li>View your lesson history and progress</li>
        <li>Manage your account settings</li>
        <li>Track your skating journey</li>
      </ul>
      
      <div style="margin-top: 25px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #856404;"><strong>⏰ Important:</strong> This registration link will expire in 24 hours for security purposes.</p>
      </div>
      
      <p style="margin-top: 20px;">We're excited to help you achieve your skating goals!</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "🎉 Account Approved - Complete Your Registration", emailContent);
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

  // Format raw calendar times without timezone conversion
  const startTimeForCal = formatRawTimeForCalendar(lessonData.startTime);
  const endTimeForCal = formatRawTimeForCalendar(lessonData.endTime);

  // Generate Google Calendar link that treats the UTC value as the actual time
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
          )}</li>
          <li style="margin-bottom: 10px;">⏰ <strong>Time:</strong> ${formatTime(
            lessonData.startTime,
          )} - ${formatTime(lessonData.endTime)}</li>
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
            : `<p style="margin-bottom: 15px;"><strong>Zelle:</strong> 714-743-7071</p>`
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
      <p style="margin-top: 20px; color: #666;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
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
      <p style="margin-top: 20px; color: #666;">This link will expire in 1 hour.</p>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>
    </div>
  `;

  return sendEmail(email, "Welcome to YM Movement - Complete Your Registration", emailContent);
}
