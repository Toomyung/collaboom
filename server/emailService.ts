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

/**
 * Generate a stable Message-ID for email threading
 * Uses a hash of the identifier to create a consistent ID that can be referenced
 */
function generateThreadId(type: "influencer" | "campaign", identifier: string): string {
  const hash = crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 16);
  return `<${type}-${hash}@${EMAIL_DOMAIN}>`;
}

/**
 * Generate threading headers for email clients
 * - Message-ID: Unique ID for this specific email
 * - In-Reply-To: References the thread's root message
 * - References: Chain of all message IDs in the thread
 */
function getThreadingHeaders(threadId: string, isFirstEmail: boolean = false): Record<string, string> {
  const uniqueId = `<msg-${Date.now()}-${crypto.randomBytes(8).toString("hex")}@${EMAIL_DOMAIN}>`;
  
  if (isFirstEmail) {
    // First email in thread uses the thread ID as its Message-ID
    return {
      "Message-ID": threadId,
    };
  }
  
  // Subsequent emails reference the thread root
  return {
    "Message-ID": uniqueId,
    "In-Reply-To": threadId,
    "References": threadId,
  };
}

export async function sendWelcomeEmail(
  to: string,
  influencerName: string,
  influencerId?: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    // Create a thread ID based on influencer for all their Collaboom emails
    const threadId = generateThreadId("influencer", influencerId || to);
    const headers = getThreadingHeaders(threadId, true); // First email starts the thread
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: "[Collaboom] Welcome to Collaboom!",
      headers,
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

    console.log(`Welcome email sent to ${to}, ID: ${data?.id}, Thread: ${threadId}`);
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
    
    // Thread by campaign+influencer combination for campaign-specific emails
    const threadKey = campaignId && influencerId 
      ? `${campaignId}-${influencerId}` 
      : `${campaignName}-${to}`;
    const threadId = generateThreadId("campaign", threadKey);
    const headers = getThreadingHeaders(threadId, true); // First campaign email starts new thread
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[Collaboom] Approved: ${campaignName}`,
      headers,
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

    console.log(`Approval email sent to ${to}, ID: ${data?.id}, Thread: ${threadId}`);
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

    // Use same thread as approval email for this campaign+influencer
    const threadKey = campaignId && influencerId 
      ? `${campaignId}-${influencerId}` 
      : `${campaignName}-${to}`;
    const threadId = generateThreadId("campaign", threadKey);
    const headers = getThreadingHeaders(threadId, false); // This replies to the approval email thread
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[Collaboom] Shipped: ${campaignName}`,
      headers,
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

    console.log(`Shipping notification sent to ${to}, ID: ${data?.id}, Thread: ${threadId}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending shipping notification:", err);
    return { success: false, error: (err as Error).message };
  }
}
