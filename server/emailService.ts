import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Domain verified - use official Collaboom email
const FROM_EMAIL = "Collaboom <hello@collaboom.io>";

// Set to null to send to actual recipients (domain is now verified)
// Set to an email address to redirect all emails for testing
const TEST_EMAIL_OVERRIDE: string | null = null;

interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
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

Visit your dashboard: https://collaboom.replit.app/dashboard

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
  brandName: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `You've been approved for ${campaignName}`,
      text: `Hi ${influencerName},

Great news! Your application for "${campaignName}" by ${brandName} has been approved.

What Happens Next?

1. The brand will ship your product soon
2. You'll receive an email with tracking info when it ships
3. Create your content following the campaign guidelines
4. Upload your content by the deadline

View campaign details: https://collaboom.replit.app/dashboard

Make sure your shipping address is up to date in your profile!

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send approval email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Approval email sent to ${to}, ID: ${data?.id}`);
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
  trackingUrl?: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    const trackingInfo = trackingUrl 
      ? `Track your package: ${trackingUrl}`
      : `Track your package on the ${courier} website using the tracking number above.`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `Your ${campaignName} package has shipped`,
      text: `Hi ${influencerName},

Your product from ${brandName} for the "${campaignName}" campaign has been shipped!

Shipping Details:
- Courier: ${courier}
- Tracking Number: ${trackingNumber}

${trackingInfo}

Reminder: Once you receive your package, don't forget to create and upload your content by the campaign deadline.

View in dashboard: https://collaboom.replit.app/dashboard

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send shipping notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`Shipping notification sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending shipping notification:", err);
    return { success: false, error: (err as Error).message };
  }
}
