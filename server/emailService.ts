import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// Domain verified - use official Collaboom email
const FROM_EMAIL = "Collaboom <hello@collaboom.io>";

// Set to null to send to actual recipients (domain is now verified)
// Set to an email address to redirect all emails for testing
const TEST_EMAIL_OVERRIDE: string | null = null;

// Email threading configuration
const EMAIL_DOMAIN = "collaboom.io";

interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

// Store for email thread tracking (in production, use database)
const emailThreadStore = new Map<string, string>();

/**
 * Generate a stable thread key for a campaign+influencer combination
 */
function getThreadKey(campaignId: string, influencerId: string): string {
  return `${campaignId}-${influencerId}`;
}

/**
 * Get stored Message-ID for a thread, if exists
 */
function getStoredMessageId(threadKey: string): string | null {
  return emailThreadStore.get(threadKey) || null;
}

/**
 * Store Message-ID for a thread
 */
function storeMessageId(threadKey: string, messageId: string): void {
  emailThreadStore.set(threadKey, messageId);
}

/**
 * Generate threading headers for email clients
 * Uses stored Message-ID from first email for proper threading
 */
function getThreadingHeaders(
  threadKey: string | null,
  resendEmailId: string | null = null
): Record<string, string> {
  if (!threadKey) return {};
  
  const storedMessageId = getStoredMessageId(threadKey);
  
  if (!storedMessageId) {
    // First email - we'll store the Resend ID after sending
    return {};
  }
  
  // Reply email - reference the first email
  return {
    "In-Reply-To": storedMessageId,
    "References": storedMessageId,
  };
}

/**
 * Convert Resend email ID to Message-ID format
 * Resend typically uses this format for Message-IDs
 */
function toMessageId(resendEmailId: string): string {
  return `<${resendEmailId}@resend.dev>`;
}

export async function sendWelcomeEmail(
  to: string,
  influencerName: string,
  influencerId?: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: "Welcome to Collaboom!",
      text: `Hi ${influencerName},

Welcome to Collaboom! We're excited to have you join our community of creators.

What's Next?

1. Complete your profile with your TikTok handle and shipping address
2. Browse available campaigns that match your niche
3. Apply to campaigns you're interested in
4. Receive free products and create content!

Visit your dashboard: https://collaboom.io/dashboard

Questions? Just reply to this email.

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Welcome email sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending welcome email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendApplicationApprovedEmail(
  to: string,
  influencerName: string,
  campaignName: string,
  brandName: string,
  influencerId?: string,
  campaignId?: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    // Thread key for campaign emails
    const threadKey = campaignId && influencerId 
      ? getThreadKey(campaignId, influencerId) 
      : null;
    
    // Use consistent subject for threading
    const subject = `[Collaboom] ${campaignName} by ${brandName}`;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      text: `Hi ${influencerName},

Great news! Your application for "${campaignName}" by ${brandName} has been approved.

What Happens Next?

1. The brand will ship your product soon
2. You'll receive an email with tracking info when it ships
3. Create your content following the campaign guidelines
4. Upload your content by the deadline

View campaign details: https://collaboom.io/dashboard

Make sure your shipping address is up to date in your profile!

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send approval email:", error);
      return { success: false, error: error.message };
    }

    // Store Message-ID for threading subsequent emails
    if (threadKey && data?.id) {
      const messageId = toMessageId(data.id);
      storeMessageId(threadKey, messageId);
      console.log(`Approval email sent to ${to}, ID: ${data.id}, Stored Thread MessageId: ${messageId}`);
    } else {
      console.log(`Approval email sent to ${to}, ID: ${data?.id}`);
    }
    
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending approval email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendShippingNotificationEmail(
  to: string,
  influencerName: string,
  campaignName: string,
  brandName: string,
  courier: string,
  trackingNumber: string,
  trackingUrl?: string,
  influencerId?: string,
  campaignId?: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    const trackingInfo = trackingUrl 
      ? `Track your package: ${trackingUrl}`
      : `Track your package on the ${courier} website using the tracking number above.`;

    // Thread key for campaign emails
    const threadKey = campaignId && influencerId 
      ? getThreadKey(campaignId, influencerId) 
      : null;
    
    // Get threading headers (references the approval email)
    const headers = getThreadingHeaders(threadKey);
    
    // Use same subject as approval email for threading (with Re: prefix)
    const baseSubject = `[Collaboom] ${campaignName} by ${brandName}`;
    const subject = Object.keys(headers).length > 0 ? `Re: ${baseSubject}` : baseSubject;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      text: `Hi ${influencerName},

Your product from ${brandName} for the "${campaignName}" campaign has been shipped!

Shipping Details:
- Courier: ${courier}
- Tracking Number: ${trackingNumber}

${trackingInfo}

Reminder: Once you receive your package, don't forget to create and upload your content by the campaign deadline.

View in dashboard: https://collaboom.io/dashboard

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send shipping notification:", error);
      return { success: false, error: error.message };
    }

    const referencedId = headers["In-Reply-To"] || "none";
    console.log(`Shipping notification sent to ${to}, ID: ${data?.id}, In-Reply-To: ${referencedId}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending shipping notification:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendAdminReplyEmail(
  to: string,
  influencerName: string,
  campaignName: string,
  brandName: string,
  originalMessage: string,
  adminResponse: string,
  influencerId?: string,
  campaignId?: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;

    // Thread key for campaign emails
    const threadKey = campaignId && influencerId 
      ? getThreadKey(campaignId, influencerId) 
      : null;
    
    // Get threading headers (references the approval email)
    const headers = getThreadingHeaders(threadKey);
    
    // Use same subject as approval email for threading (with Re: prefix)
    const baseSubject = `[Collaboom] ${campaignName} by ${brandName}`;
    const subject = Object.keys(headers).length > 0 ? `Re: ${baseSubject}` : baseSubject;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      text: `Hi ${influencerName},

You have a new response from the Collaboom team regarding your message for "${campaignName}" by ${brandName}.

Your Message:
"${originalMessage}"

Our Response:
"${adminResponse}"

If you have any further questions, you can reply through your dashboard.

View in dashboard: https://collaboom.io/dashboard

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send admin reply email:", error);
      return { success: false, error: error.message };
    }

    const referencedId = headers["In-Reply-To"] || "none";
    console.log(`Admin reply email sent to ${to}, ID: ${data?.id}, In-Reply-To: ${referencedId}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending admin reply email:", err);
    return { success: false, error: (err as Error).message };
  }
}
