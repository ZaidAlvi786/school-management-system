import { Resend } from "resend";

// Initialize Resend client lazily
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

interface InviteEmailParams {
  to: string;
  name: string;
  role: string;
  temporaryPassword: string;
  schoolName?: string;
  loginUrl: string;
}

export async function sendInviteEmail({
  to,
  name,
  role,
  temporaryPassword,
  schoolName,
  loginUrl,
}: InviteEmailParams) {
  try {
    if (!process.env.RESEND_API_KEY) {
      const errorMsg = "RESEND_API_KEY not set. Email service not configured.";
      console.error(errorMsg);
      console.error("Invite details that should have been sent:", {
        to,
        name,
        role,
        temporaryPassword,
        schoolName,
        loginUrl,
      });
      return { success: false, error: errorMsg };
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.warn("RESEND_FROM_EMAIL not set. Using default sender.");
    }

    // Test mode: Redirect all emails to test address if configured
    const testEmail = process.env.RESEND_TEST_EMAIL;
    const actualRecipient = to;
    const emailToSend = testEmail || to;
    
    if (testEmail) {
      console.log(`[EMAIL] TEST MODE: Redirecting email from ${actualRecipient} to ${testEmail}`);
    }

    const roleDisplayName =
      role === "principal"
        ? "Principal"
        : role === "teacher"
        ? "Teacher"
        : role === "admin"
        ? "Administrator"
        : role === "student"
        ? "Student"
        : role === "parent"
        ? "Parent"
        : role;

    const subject = schoolName
      ? `Welcome to ${schoolName} - Your Account Has Been Created`
      : `Welcome - Your ${roleDisplayName} Account Has Been Created`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🎓 Welcome!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">School Management System</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Hello ${name},</p>
              
              <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
                Your <strong style="color: #667eea;">${roleDisplayName}</strong> account has been created${schoolName ? ` for <strong style="color: #667eea;">${schoolName}</strong>` : ""}. 
      You can now access the school management system using the credentials below:
    </p>
    
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8f9ff 0%, #f3f4ff 100%); border: 2px solid #e0e7ff; border-radius: 10px; padding: 25px; margin: 25px 0;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 15px; border-bottom: 1px solid #d1d5db;">
                          <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 8px;">Email Address</p>
                          <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${to}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                          <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 8px;">Temporary Password</p>
                          <div style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px 15px; display: inline-block;">
                            <code style="font-family: 'Courier New', monospace; font-size: 18px; color: #667eea; font-weight: 600; letter-spacing: 1px;">${temporaryPassword}</code>
    </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                      🚀 Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 18px 20px; margin: 25px 0;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                      <strong style="color: #d97706;">⚠️ Security Reminder:</strong> Please change your password after your first login for security purposes.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 30px 0 0 0;">
      If you have any questions or need assistance, please contact your school administrator.
    </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
                This is an automated email. Please do not reply to this message.<br>
                © ${new Date().getFullYear()} School Management System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
Welcome to School Management System

Hello ${name},

Your ${roleDisplayName} account has been created${schoolName ? ` for ${schoolName}` : ""}. 
You can now access the school management system using the credentials below:

Email: ${to}
Temporary Password: ${temporaryPassword}

Login URL: ${loginUrl}

⚠️ Important: Please change your password after your first login for security purposes.

If you have any questions or need assistance, please contact your school administrator.

This is an automated email. Please do not reply to this message.
    `;

    console.log(`[EMAIL] Attempting to send invite email to: ${to}`);
    console.log(`[EMAIL] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);
    console.log(`[EMAIL] RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || "not set"}`);
    
    let resendClient;
    try {
      resendClient = getResendClient();
      console.log(`[EMAIL] Resend client initialized successfully`);
    } catch (clientError: any) {
      console.error(`[EMAIL] Failed to initialize Resend client:`, clientError);
      return { success: false, error: clientError.message || "Failed to initialize email client" };
    }
    
    // Modify subject to include original recipient in test mode
    const emailSubject = testEmail 
      ? `[TEST - Original: ${actualRecipient}] ${subject}`
      : subject;
    
    // Modify content to show original recipient in test mode
    let modifiedHtmlContent = htmlContent;
    let modifiedTextContent = textContent;
    
    if (testEmail) {
      const testNotice = `
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>⚠️ TEST MODE:</strong> This email was redirected from the original recipient: <strong>${actualRecipient}</strong>
          </p>
        </div>
      `;
      modifiedHtmlContent = modifiedHtmlContent.replace(
        '<p style="font-size: 18px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Hello',
        testNotice + '<p style="font-size: 18px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Hello'
      );
      
      modifiedTextContent = `⚠️ TEST MODE: This email was redirected from ${actualRecipient}\n\n${modifiedTextContent}`;
    }

    const { data, error } = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "School Management <onboarding@resend.dev>",
      to: [emailToSend],
      subject: emailSubject,
      html: modifiedHtmlContent,
      text: modifiedTextContent,
    });

    if (error) {
      console.error("Resend API error sending email:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check if it's a domain verification error
      if (error.message?.includes("verif") || error.message?.includes("domain") || error.name === "validation_error") {
        console.error("⚠️ DOMAIN VERIFICATION REQUIRED:");
        console.error("Resend is in testing mode. You can only send emails to your verified email address.");
        console.error("To send emails to other recipients:");
        console.error("1. Go to https://resend.com/domains");
        console.error("2. Verify your domain");
        console.error("3. Update RESEND_FROM_EMAIL to use your verified domain (e.g., noreply@yourdomain.com)");
      }
      
      return { success: false, error: error.message || "Failed to send email via Resend API" };
    }

    console.log(`Invite email sent successfully to: ${emailToSend}${testEmail ? ` (redirected from ${actualRecipient})` : ''}`);
    console.log("Email ID:", data?.id);
    return { success: true, data };
  } catch (error: any) {
    console.error("Exception while sending invite email:", error);
    console.error("Error stack:", error.stack);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

interface NotificationEmailParams {
  to: string;
  name: string;
  role: string;
  schoolName?: string;
  loginUrl: string;
}

export async function sendNotificationEmail({
  to,
  name,
  role,
  schoolName,
  loginUrl,
}: NotificationEmailParams) {
  try {
    if (!process.env.RESEND_API_KEY) {
      const errorMsg = "RESEND_API_KEY not set. Email service not configured.";
      console.error(errorMsg);
      console.error("Notification details that should have been sent:", {
        to,
        name,
        role,
        schoolName,
        loginUrl,
      });
      return { success: false, error: errorMsg };
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.warn("RESEND_FROM_EMAIL not set. Using default sender.");
    }

    // Test mode: Redirect all emails to test address if configured
    const testEmail = process.env.RESEND_TEST_EMAIL;
    const actualRecipient = to;
    const emailToSend = testEmail || to;
    
    if (testEmail) {
      console.log(`[EMAIL] TEST MODE: Redirecting notification email from ${actualRecipient} to ${testEmail}`);
    }

    const roleDisplayName =
      role === "principal"
        ? "Principal"
        : role === "teacher"
        ? "Teacher"
        : role === "admin"
        ? "Administrator"
        : role === "student"
        ? "Student"
        : role === "parent"
        ? "Parent"
        : role;

    const subject = schoolName
      ? `You've been added as ${roleDisplayName} at ${schoolName}`
      : `You've been added as ${roleDisplayName}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Role Assignment Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
                ✅
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Role Assigned!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">School Management System</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Hello ${name},</p>
              
              <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! You have been added as a <strong style="color: #10b981; font-size: 18px;">${roleDisplayName}</strong>${schoolName ? ` for <strong style="color: #10b981;">${schoolName}</strong>` : ""}.
              </p>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #a7f3d0; border-radius: 10px; padding: 25px; margin: 25px 0;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 15px; color: #065f46; line-height: 1.6;">
                      <strong style="display: block; margin-bottom: 8px;">📧 Your Account:</strong>
                      You can now access the school management system using your existing account credentials (${to}).
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                      🎯 Access Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Feature Highlights -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td>
                    <p style="font-size: 14px; color: #6b7280; margin: 0 0 15px 0; font-weight: 600;">What you can do now:</p>
                    <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                      <li>Access your ${roleDisplayName.toLowerCase()} dashboard</li>
                      <li>Manage school resources and information</li>
                      <li>View and update relevant data</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions or need assistance, please contact your school administrator.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
                This is an automated email. Please do not reply to this message.<br>
                © ${new Date().getFullYear()} School Management System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
School Management System

Hello ${name},

You have been added as a ${roleDisplayName}${schoolName ? ` for ${schoolName}` : ""}.

You can now access the school management system using your existing account credentials.

Login URL: ${loginUrl}

If you have any questions or need assistance, please contact your school administrator.

This is an automated email. Please do not reply to this message.
    `;

    console.log(`[EMAIL] Attempting to send notification email to: ${to}`);
    console.log(`[EMAIL] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);
    console.log(`[EMAIL] RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || "not set"}`);
    
    let resendClient;
    try {
      resendClient = getResendClient();
      console.log(`[EMAIL] Resend client initialized successfully`);
    } catch (clientError: any) {
      console.error(`[EMAIL] Failed to initialize Resend client:`, clientError);
      return { success: false, error: clientError.message || "Failed to initialize email client" };
    }
    
    // Modify subject to include original recipient in test mode
    const emailSubject = testEmail 
      ? `[TEST - Original: ${actualRecipient}] ${subject}`
      : subject;
    
    // Modify content to show original recipient in test mode
    let modifiedHtmlContent = htmlContent;
    let modifiedTextContent = textContent;
    
    if (testEmail) {
      const testNotice = `
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>⚠️ TEST MODE:</strong> This email was redirected from the original recipient: <strong>${actualRecipient}</strong>
          </p>
        </div>
      `;
      modifiedHtmlContent = modifiedHtmlContent.replace(
        '<p style="font-size: 18px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Hello',
        testNotice + '<p style="font-size: 18px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Hello'
      );
      
      modifiedTextContent = `⚠️ TEST MODE: This email was redirected from ${actualRecipient}\n\n${modifiedTextContent}`;
    }

    const { data, error } = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "School Management <onboarding@resend.dev>",
      to: [emailToSend],
      subject: emailSubject,
      html: modifiedHtmlContent,
      text: modifiedTextContent,
    });

    if (error) {
      console.error("Resend API error sending notification email:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check if it's a domain verification error
      if (error.message?.includes("verif") || error.message?.includes("domain") || error.name === "validation_error") {
        console.error("⚠️ DOMAIN VERIFICATION REQUIRED:");
        console.error("Resend is in testing mode. You can only send emails to your verified email address.");
        console.error("To send emails to other recipients:");
        console.error("1. Go to https://resend.com/domains");
        console.error("2. Verify your domain");
        console.error("3. Update RESEND_FROM_EMAIL to use your verified domain (e.g., noreply@yourdomain.com)");
      }
      
      return { success: false, error: error.message || "Failed to send email via Resend API" };
    }

    console.log(`Notification email sent successfully to: ${emailToSend}${testEmail ? ` (redirected from ${actualRecipient})` : ''}`);
    console.log("Email ID:", data?.id);
    return { success: true, data };
  } catch (error: any) {
    console.error("Exception while sending notification email:", error);
    console.error("Error stack:", error.stack);
    return { success: false, error: error.message || "Failed to send email" };
  }
}
