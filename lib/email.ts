import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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
      console.warn("RESEND_API_KEY not set. Email not sent. This is the invite details:");
      console.log({
        to,
        name,
        role,
        temporaryPassword,
        schoolName,
        loginUrl,
      });
      return { success: false, error: "Email service not configured" };
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to School Management System</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your ${roleDisplayName} account has been created${schoolName ? ` for <strong>${schoolName}</strong>` : ""}. 
      You can now access the school management system using the credentials below:
    </p>
    
    <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 10px 0;"><strong>Email:</strong> ${to}</p>
      <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${temporaryPassword}</code></p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
        Login to Your Account
      </a>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions or need assistance, please contact your school administrator.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
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

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "School Management <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    console.log("Invite email sent successfully:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}
