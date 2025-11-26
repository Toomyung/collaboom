import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Collaboom <onboarding@resend.dev>";

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
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Welcome to Collaboom! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #8a01ff; font-size: 28px; margin: 0;">Collaboom</h1>
              </div>
              
              <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">
                Welcome, ${influencerName}! 🎉
              </h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We're thrilled to have you join Collaboom! You're now part of an exclusive community of creators collaborating with top K-Beauty, Food, and Lifestyle brands.
              </p>
              
              <div style="background-color: #f8f4ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #8a01ff; font-size: 16px; margin: 0 0 12px 0;">What's Next?</h3>
                <ul style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Complete your profile with your TikTok handle and shipping address</li>
                  <li>Browse available campaigns that match your niche</li>
                  <li>Apply to campaigns you're excited about</li>
                  <li>Receive free products and create amazing content!</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://collaboom.replit.app/dashboard" style="display: inline-block; background-color: #8a01ff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Dashboard
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
                Questions? Reply to this email and we'll help you out!
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
              © 2025 Collaboom. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
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
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Great news! You've been approved for ${campaignName} 🎁`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #8a01ff; font-size: 28px; margin: 0;">Collaboom</h1>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  ✓ Application Approved
                </span>
              </div>
              
              <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px; text-align: center;">
                Congratulations, ${influencerName}!
              </h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
                Your application for <strong>${campaignName}</strong> by <strong>${brandName}</strong> has been approved!
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #166534; font-size: 16px; margin: 0 0 12px 0;">What Happens Next?</h3>
                <ol style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>The brand will ship your product soon</li>
                  <li>You'll receive a tracking notification when it ships</li>
                  <li>Create your content following the campaign guidelines</li>
                  <li>Upload your content by the deadline</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://collaboom.replit.app/dashboard" style="display: inline-block; background-color: #8a01ff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Campaign Details
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
                Make sure your shipping address is up to date in your profile!
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
              © 2025 Collaboom. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
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
    const trackingSection = trackingUrl
      ? `<a href="${trackingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Track Your Package</a>`
      : `<p style="color: #666; font-size: 14px;">Track your package using the tracking number above on the ${courier} website.</p>`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Your ${campaignName} package has shipped! 📦`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #8a01ff; font-size: 28px; margin: 0;">Collaboom</h1>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  📦 Package Shipped
                </span>
              </div>
              
              <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px; text-align: center;">
                Your package is on the way!
              </h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
                Hi ${influencerName}, your product from <strong>${brandName}</strong> for the <strong>${campaignName}</strong> campaign has been shipped!
              </p>
              
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 16px 0;">Shipping Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="color: #666; padding: 4px 0;">Courier:</td>
                    <td style="color: #1a1a1a; font-weight: 600; text-align: right;">${courier}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 4px 0;">Tracking Number:</td>
                    <td style="color: #1a1a1a; font-weight: 600; text-align: right; font-family: monospace;">${trackingNumber}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                ${trackingSection}
              </div>
              
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #854d0e; font-size: 14px; margin: 0;">
                  <strong>Reminder:</strong> Once you receive your package, don't forget to create and upload your content by the campaign deadline!
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="https://collaboom.replit.app/dashboard" style="color: #8a01ff; text-decoration: none; font-size: 14px; font-weight: 600;">
                  View in Dashboard →
                </a>
              </div>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
              © 2025 Collaboom. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
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
