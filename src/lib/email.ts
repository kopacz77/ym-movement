// src/lib/email.ts
import { Resend } from 'resend';

// Initialize Resend with API key
// Make sure process.env.RESEND_API_KEY is defined in your .env file
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = new Resend(resendApiKey);

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
        <h1 style="color: #3b82f6;">Welcome to Yura Min Academy!</h1>
        <p>Hello ${name},</p>
        <p>Thank you for registering with Yura Min Academy. We're excited to have you join us!</p>
        <p>Your account has been created and is currently pending approval by our administrators. You'll receive another email once your account has been approved.</p>
        <p>In the meantime, if you have any questions, please don't hesitate to contact us.</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
          <p style="margin: 0; font-weight: bold;">Your account details:</p>
          <p style="margin: 5px 0;">Email: ${email}</p>
        </div>
        <p style="margin-top: 20px;">Best regards,</p>
        <p>The Yura Min Academy Team</p>
      </div>
    `;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not found, using fallback email method');
      return await fallbackEmailMethod(email, 'Welcome to Yura Min Academy', emailContent);
    }
    
    const { data, error } = await resend.emails.send({
      from: 'Yura Min Academy <noreply@ym-movement.com>',
      to: email,
      subject: 'Welcome to Yura Min Academy',
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
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Account Approved!</h1>
        <p>Hello ${name},</p>
        <p>Great news! Your Yura Min Academy account has been approved.</p>
        <p>You can now log in and start scheduling lessons, view your progress, and more.</p>
        <p>We look forward to helping you achieve your skating goals!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In Now</a>
        <p style="margin-top: 20px;">Best regards,</p>
        <p>The Yura Min Academy Team</p>
      </div>
    `;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not found, using fallback email method');
      return await fallbackEmailMethod(email, 'Your Yura Min Academy Account Has Been Approved', emailContent);
    }

    const { data, error } = await resend.emails.send({
      from: 'Yura Min Academy <noreply@ym-movement.com>',
      to: email,
      subject: 'Your Yura Min Academy Account Has Been Approved',
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