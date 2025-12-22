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

export async function sendSupportTicketResponseEmail(
  to: string,
  influencerName: string,
  ticketSubject: string,
  originalMessage: string,
  adminResponse: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[Collaboom Support] Re: ${ticketSubject}`,
      text: `Hi ${influencerName},

You have received a response to your support ticket.

Your Question:
"${originalMessage}"

Our Response:
"${adminResponse}"

If you have any further questions, feel free to submit a new support ticket through your dashboard.

View your dashboard: https://collaboom.io/dashboard

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send support ticket response email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Support ticket response email sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending support ticket response email:", err);
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

View your dashboard: https://collaboom.io/dashboard

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

export async function sendAccountSuspendedEmail(
  to: string,
  influencerName: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: "[Collaboom] Your Account Has Been Suspended",
      text: `Hi ${influencerName},

We regret to inform you that your Collaboom account has been suspended.

This action was taken due to a violation of our community guidelines or suspicious activity detected on your account.

While your account is suspended, you will not be able to:
- Apply to new campaigns
- Participate in ongoing campaigns

If you believe this decision was made in error, you can submit an appeal by logging into your account and providing additional information.

Log in to submit an appeal: https://collaboom.io/login

We take these matters seriously and will review any appeals promptly.

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send account suspended email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Account suspended email sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending account suspended email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendAccountUnsuspendedEmail(
  to: string,
  influencerName: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: "[Collaboom] Your Account Has Been Reinstated",
      text: `Hi ${influencerName},

Good news! Your Collaboom account has been reinstated and is now fully active again.

You can now:
- Browse and apply to campaigns
- Participate in collaborations
- Access all platform features

We appreciate your patience and understanding during this process.

Visit your dashboard: https://collaboom.io/dashboard

Welcome back!

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send account unsuspended email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Account unsuspended email sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending account unsuspended email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendAccountBlockedEmail(
  to: string,
  influencerName: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: "[Collaboom] Your Account Has Been Blocked",
      text: `Hi ${influencerName},

We regret to inform you that your Collaboom account has been permanently blocked due to serious violations of our community guidelines.

As a result, you will no longer be able to access the platform or participate in any campaigns.

If you believe this decision was made in error or there has been a misunderstanding, please reach out to us at hello@toomyungpeople.com. We will review your case and respond as soon as possible.

Thank you for your understanding.

- The Collaboom Team`,
    });

    if (error) {
      console.error("Failed to send account blocked email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Account blocked email sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending account blocked email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendDirectAdminEmail(
  to: string,
  influencerName: string,
  subject: string,
  body: string
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    const fullBody = `Hi ${influencerName},

${body}

---
Please DO NOT reply to this email, it will bounce back.
If you have any questions, please log in to your Collaboom dashboard and contact support.

Visit your dashboard: https://collaboom.io/dashboard

- The Collaboom Team`;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[Collaboom] ${subject}`,
      text: fullBody,
    });

    if (error) {
      console.error("Failed to send direct admin email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Direct admin email sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending direct admin email:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendTierUpgradeEmail(
  to: string,
  influencerName: string,
  newTier: "standard" | "vip"
): Promise<EmailResult> {
  try {
    const recipient = TEST_EMAIL_OVERRIDE || to;
    
    let subject: string;
    let body: string;
    
    if (newTier === "standard") {
      subject = "Congratulations! You're Now a Standard Influencer";
      body = `Hi ${influencerName},

Congratulations on completing your first campaign! You've officially leveled up to Standard Influencer status.

What This Means For You:

- Apply to up to 3 campaigns per day
- Access all paid campaigns on Collaboom (Basic, Link in Bio, Amazon Video)
- Full access to your personal dashboard
- Forum support through your dashboard
- Email notifications for all updates

Your Next Goal: VIP Status

Keep completing campaigns successfully to reach 85 points and unlock VIP benefits:
- Paid collaboration 24-hour early access
- One-click auto-approval (no waiting!)
- Unlimited campaign applications
- Priority team support

Keep up the great work!

Visit your dashboard: https://collaboom.io/dashboard

Learn more about the tier system: https://collaboom.io/score-tier

- The Collaboom Team`;
    } else {
      subject = "Welcome to VIP Status! You're Now a VIP Influencer";
      body = `Hi ${influencerName},

WOW! You've reached the highest tier on Collaboom - VIP Influencer!

This is a huge achievement that less than 5% of our creators have accomplished. Your dedication and consistent quality work have earned you elite status.

Your Exclusive VIP Benefits:

- Paid Collaboration Early Access: Get 24 hours head start on paid campaigns through an exclusive page
- One-Click Auto-Approval: No more waiting for brand approval - you're automatically approved!
- Unlimited Applications: Apply to as many campaigns as you want with no daily limits
- Priority Team Support: Get faster responses and dedicated assistance from our team

You've proven yourself as a trusted creator, and brands love working with you.

Keep creating amazing content!

Visit your dashboard: https://collaboom.io/dashboard

Learn more about VIP benefits: https://collaboom.io/score-tier

- The Collaboom Team`;
    }
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[Collaboom] ${subject}`,
      text: body,
    });

    if (error) {
      console.error("Failed to send tier upgrade email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Tier upgrade email (${newTier}) sent to ${to}, ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Error sending tier upgrade email:", err);
    return { success: false, error: (err as Error).message };
  }
}
