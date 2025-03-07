// src/lib/email.ts
import { Resend } from 'resend';
import { format } from 'date-fns';

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = new Resend(resendApiKey);

// Get the base URL from environment variables with proper fallbacks for different hosting environments
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || process.env.NETLIFY_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Fallback method if Resend isn't available or configured
async function fallbackEmailMethod(to: string, subject: string, html: string) {
  console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
  console.log(`[MOCK EMAIL] Content: ${html.substring(0, 100)}...`);
  return { id: 'mock-email-id' };
}

/**
 * Sends a welcome email to a new student
 * @param email Student's email address
 * @param name Student's name
 * @returns Promise with the result of the email send operation
 */
export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Welcome to YM - Movement!</h1>
      <p>Hello ${name},</p>
      <p>Thank you for registering with YM - Movement. We're excited to have you join us!</p>
      <p>Your account has been created and is currently pending approval by our administrators. You'll receive another email once your account has been approved.</p>
      <p>In the meantime, if you have any questions, please don't hesitate to contact us.</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
        <p style="margin: 0; font-weight: bold;">Your account details:</p>
        <p style="margin: 5px 0;">Email: ${email}</p>
      </div>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM - Movement Team</p>
    </div>
    `;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not found, using fallback email method');
      return await fallbackEmailMethod(email, 'Welcome to YM - Movement', emailContent);
    }

    const { data, error } = await resend.emails.send({
      from: 'YM - Movement <noreply@ym-movement.com>',
      to: email,
      subject: 'Welcome to YM - Movement',
      html: emailContent,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    console.log('Welcome email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception sending welcome email:', error);
    // Return a mock result instead of throwing
    return { id: 'error-fallback', error: error };
  }
}

/**
 * Sends an approval notification email to a student
 * @param email Student's email address
 * @param name Student's name
 * @returns Promise with the result of the email send operation
 */
export async function sendApprovalEmail(email: string, name: string) {
  try {
    // Fixed login URL path to ensure it routes to the auth/login page
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #3b82f6;">Account Approved!</h1>
      <p>Hello ${name},</p>
      <p>Great news! Your YM - Movement account has been approved.</p>
      <p>You can now log in and start scheduling lessons, view your progress, and more.</p>
      <p>We look forward to helping you achieve your skating goals!</p>
      <a href="${BASE_URL}/auth/login" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In Now</a>
      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM - Movement Team</p>
    </div>
    `;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not found, using fallback email method');
      return await fallbackEmailMethod(email, 'Your YM - Movement Account Has Been Approved', emailContent);
    }

    const { data, error } = await resend.emails.send({
      from: 'YM - Movement <noreply@ym-movement.com>',
      to: email,
      subject: 'Your YM - Movement Account Has Been Approved',
      html: emailContent,
    });

    if (error) {
      console.error('Error sending approval email:', error);
      throw new Error(`Failed to send approval email: ${error.message}`);
    }

    console.log('Approval email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception sending approval email:', error);
    // Return a mock result instead of throwing
    return { id: 'error-fallback', error: error };
  }
}

/**
 * Formats a date to a readable string (e.g., "Monday, January 1, 2025")
 */
function formatDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Formats time to a readable string (e.g., "3:30 PM")
 */
function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

/**
 * Generates a reference code for the lesson
 */
function generateReferenceCode(name: string, date: Date): string {
  const nameInitials = name.split(' ')
    .map(part => part.charAt(0))
    .join('');
  const dateStr = format(date, 'MMddyy');
  const timeStr = format(date, 'HHmm');
  return `${nameInitials}${dateStr}-${timeStr}`;
}

/**
 * Sends a lesson confirmation email to a student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param lessonData Object containing lesson details
 * @param paymentMethod Payment method selected by student
 * @param referenceCode Payment reference code
 * @param googleEventId Google Calendar event ID
 * @returns Promise with the result of the email send operation
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
  googleEventId?: string | null
) {
  try {
    console.log(`[EMAIL] Sending lesson confirmation to ${studentEmail}`);
    
    const duration = Math.round(
      (lessonData.endTime.getTime() - lessonData.startTime.getTime()) / (1000 * 60)
    );
    
    // Generate Google Calendar link - using the dates directly rather than from the event ID
    const googleCalendarLink = `https://calendar.google.com/calendar/event?action=TEMPLATE&dates=${
      lessonData.startTime.toISOString().replace(/[-:]/g, '')
    }/${
      lessonData.endTime.toISOString().replace(/[-:]/g, '')
    }&text=${
      encodeURIComponent(`Ice Dance Lesson: ${studentName}`)
    }&location=${
      encodeURIComponent(lessonData.rinkAddress)
    }&details=${
      encodeURIComponent(`Student: ${studentName} (${studentEmail})\nLocation: ${lessonData.rinkName}\nAddress: ${lessonData.rinkAddress}\nDuration: ${duration === 60 ? '1 hour' : '30 minutes'}`)
    }`;
    
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Your ${duration === 60 ? '1-Hour' : '30-Minute'} Lesson is Confirmed!</h1>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">Lesson Details</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;">📅 <strong>Date:</strong> ${formatDate(lessonData.startTime)}</li>
          <li style="margin-bottom: 10px;">⏰ <strong>Time:</strong> ${formatTime(lessonData.startTime)} - ${formatTime(lessonData.endTime)}</li>
          <li style="margin-bottom: 10px;">📍 <strong>Location:</strong> ${lessonData.rinkName}</li>
          <li style="margin-bottom: 10px;">📝 <strong>Address:</strong> ${lessonData.rinkAddress}</li>
          <li style="margin-bottom: 10px;">⏱️ <strong>Duration:</strong> ${duration === 60 ? '1 hour' : '30 minutes'}</li>
          <li style="margin-bottom: 10px;">🏆 <strong>Lesson Type:</strong> ${lessonData.type}</li>
        </ul>
      </div>

      <div style="background-color: #e8f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">Payment Information</h2>
        <p style="margin-bottom: 15px;">💳 <strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
        
        ${paymentMethod.toLowerCase() === 'venmo' 
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
        <p style="margin-bottom: 10px;">To cancel or reschedule, please visit your student dashboard or contact us directly.</p>
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

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not found, using fallback email method');
      return await fallbackEmailMethod(studentEmail, `Lesson Confirmation: Ice Dance Lesson with ${studentName}`, emailContent);
    }

    const { data, error } = await resend.emails.send({
      from: 'YM - Movement <noreply@ym-movement.com>',
      to: studentEmail,
      reply_to: 'yuraxmin@gmail.com',
      subject: `Lesson Confirmation: Ice Dance Lesson with ${studentName}`,
      html: emailContent,
    });

    if (error) {
      console.error('Error sending lesson confirmation email:', error);
      throw new Error(`Failed to send lesson confirmation email: ${error.message}`);
    }

    console.log('Lesson confirmation email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception sending lesson confirmation email:', error);
    // Return a mock result instead of throwing
    return { id: 'error-fallback', error: error };
  }
}