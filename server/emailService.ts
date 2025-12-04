import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Collaboom <hello@collaboom.io>";

const TEST_EMAIL_OVERRIDE: string | null = null;

interface EmailResult {
  success: boolean;
  emailId?: string;
  messageId?: string;
  error?: string;
}

function toMessageId(resendEmailId: string): string {
  return `<${resendEmailId}@resend.dev>`;
}

export async function sendWelcomeEmail(
  to: string,
  influencerName: string
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
  existingThreadId?: string | null
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    const subject = `[Collaboom] ${campaignName} by ${brandName}`;
    
    // Generate a unique Message-ID for threading
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageId = `<collaboom-${uniqueId}@collaboom.io>`;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      headers: {
        "Message-ID": messageId,
      },
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

    // Return our custom Message-ID for threading (not the Resend ID)
    console.log(`Approval email sent to ${to}, ID: ${data?.id}, MessageId: ${messageId}`);
    
    return { success: true, emailId: data?.id, messageId };
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
  existingThreadId?: string | null
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    const trackingInfo = trackingUrl 
      ? `Track your package: ${trackingUrl}`
      : `Track your package on the ${courier} website using the tracking number above.`;

    const baseSubject = `[Collaboom] ${campaignName} by ${brandName}`;
    
    const headers: Record<string, string> = {};
    let subject = baseSubject;
    
    if (existingThreadId) {
      headers["In-Reply-To"] = existingThreadId;
      headers["References"] = existingThreadId;
      subject = `Re: ${baseSubject}`;
    }
    
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

    const referencedId = existingThreadId || "none";
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
  existingThreadId?: string | null
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;

    const baseSubject = `[Collaboom] ${campaignName} by ${brandName}`;
    
    const headers: Record<string, string> = {};
    let subject = baseSubject;
    
    if (existingThreadId) {
      headers["In-Reply-To"] = existingThreadId;
      headers["References"] = existingThreadId;
      subject = `Re: ${baseSubject}`;
    }
    
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

    const referencedId = existingThreadId || "none";
    console.log(`Admin reply email sent to ${to}, ID: ${data?.id}, In-Reply-To: ${referencedId}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending admin reply email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendUploadVerifiedEmail(
  to: string,
  influencerName: string,
  campaignName: string,
  brandName: string,
  pointsAwarded: number,
  existingThreadId?: string | null
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;

    const baseSubject = `[Collaboom] ${campaignName} by ${brandName}`;
    
    const headers: Record<string, string> = {};
    let subject = baseSubject;
    
    if (existingThreadId) {
      headers["In-Reply-To"] = existingThreadId;
      headers["References"] = existingThreadId;
      subject = `Re: ${baseSubject}`;
    }

    const pointsLine = pointsAwarded > 0 
      ? `You've earned +${pointsAwarded} points for this campaign!\n\n`
      : "";
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      text: `Hi ${influencerName},

Great news! Your video for "${campaignName}" by ${brandName} has been reviewed and verified.

${pointsLine}Thank you for participating in this campaign. We appreciate your creativity and effort!

View your dashboard here:
https://collaboom.io/dashboard

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send upload verified email:", error);
      return { success: false, error: error.message };
    }

    const referencedId = existingThreadId || "none";
    console.log(`Upload verified email sent to ${to}, ID: ${data?.id}, In-Reply-To: ${referencedId}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending upload verified email:", err);
    return { success: false, error: (err as Error).message };
  }
}
