import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create a reusable transporter using the default SMTP transport
const createTransporter = async () => {
  // If user provided a named service like 'gmail'
  if (process.env.SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // If user provided custom SMTP host & credentials
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Otherwise, use ethereal email for testing
  console.log("No SMTP credentials found in .env, using Ethereal Email for testing...");
  const testAccount = await nodemailer.createTestAccount();
  
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const getSenderEmail = () => {
  if (process.env.SMTP_USER) return process.env.SMTP_USER;
  if (process.env.SMTP_FROM) {
    const match = process.env.SMTP_FROM.match(/<([^>]+)>/);
    return match ? match[1] : process.env.SMTP_FROM;
  }
  return 'noreply@velvix.com';
};

export const sendEmail = async (options) => {
  try {
    const transporter = await createTransporter();
    const senderEmail = getSenderEmail();

    const mailOptions = {
      from: options.from || `"Velvix" <${senderEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message.replace(/\n/g, "<br>")}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email successfully sent: %s", info.messageId);

    // If using ethereal, we can get a preview URL
    if (info.messageId && !process.env.SMTP_HOST && !process.env.SMTP_SERVICE) {
      console.log("Ethereal Email Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendCandidateInviteEmail = async ({
  email,
  firstName,
  tempPassword,
  inviteToken,
  expiryHours = 72,
  recruiterEmail = 'recruiting@velvix.com',
}) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const portalLink = `${baseUrl}/candidate/first-login?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(email)}`;
  const senderEmail = getSenderEmail();

  console.log('\n================== CANDIDATE INVITE EMAIL ==================');
  console.log(`From:               Candidate Portal <${senderEmail}>`);
  console.log(`Recipient:          ${email}`);
  console.log(`Candidate Name:     ${firstName || 'Candidate'}`);
  console.log(`Temporary Password: ${tempPassword}`);
  console.log(`Activation Link:    ${portalLink}`);
  console.log(`Expiry Window:      ${expiryHours} Hours`);
  console.log('============================================================\n');

  const subject = 'Your candidate portal access';

  const textMessage = `Hello ${firstName || 'Candidate'},\n\n` +
    `You have been invited to the Velvix Candidate Portal.\n\n` +
    `Portal Link: ${portalLink}\n` +
    `Your Login Email: ${email}\n` +
    `Temporary Password: ${tempPassword}\n\n` +
    `Important: This temporary password and invite link will expire in ${expiryHours} hours.\n` +
    `Upon your first login, you will be prompted to set a permanent, secure password.\n\n` +
    `If you have questions or your invite expires, contact ${recruiterEmail}.\n\n` +
    `Best regards,\nVelvix Staffing Team`;

  const htmlMessage = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Velvix Staffing Portal</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Candidate Access Invitation</p>
      </div>

      <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <p style="font-size: 16px; margin-top: 0;">Hello <strong>${firstName || 'Candidate'}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">You have been invited to access the Velvix Candidate Portal. Use your temporary credentials below to complete your initial login and set your new password.</p>

        <div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Login Email:</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">${email}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Temporary Password:</p>
          <p style="margin: 0; font-family: monospace; font-size: 18px; font-weight: 700; color: #4338ca; letter-spacing: 1px;">${tempPassword}</p>
        </div>

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${portalLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Access Candidate Portal</a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">Or copy and paste this URL into your browser:<br/><span style="word-break: break-all; color: #6366f1;">${portalLink}</span></p>
      </div>

      <div style="padding: 12px 16px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca; margin-bottom: 20px;">
        <p style="font-size: 13px; color: #991b1b; margin: 0; line-height: 1.5;">
          ⏳ <strong>Security Notice:</strong> This link and temporary password expire in <strong>${expiryHours} hours</strong>. You will be required to set your own secure password upon first login.
        </p>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">
        Need help or link expired? Contact your recruiter at <a href="mailto:${recruiterEmail}" style="color: #4f46e5;">${recruiterEmail}</a>
      </p>
    </div>
  `;

  return sendEmail({
    from: `"Candidate Portal" <${senderEmail}>`,
    email,
    subject,
    message: textMessage,
    html: htmlMessage,
  });
};

export const sendEmployeeInviteEmail = async ({
  email,
  name,
  tempPassword,
  designation = '',
  role = 'employee',
  expiryHours = 72,
  adminEmail = 'admin@velvix.com',
}) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const loginLink = `${baseUrl}/login?email=${encodeURIComponent(email)}`;
  const senderEmail = getSenderEmail();

  console.log('\n================== EMPLOYEE INVITE EMAIL ==================');
  console.log(`From:               Employee Portal <${senderEmail}>`);
  console.log(`Recipient:          ${email}`);
  console.log(`Employee Name:      ${name || 'Employee'}`);
  console.log(`Designation:        ${designation || 'Staff Member'}`);
  console.log(`Role:               ${role.toUpperCase()}`);
  console.log(`Temporary Password: ${tempPassword}`);
  console.log(`Login URL:          ${loginLink}`);
  console.log(`Expiry Window:      ${expiryHours} Hours`);
  console.log('===========================================================\n');

  const subject = 'Welcome to Velvix CRM - Your Login Credentials';

  const textMessage = `Hello ${name || 'Employee'},\n\n` +
    `An employee account has been created for you on the Velvix CRM Platform.\n\n` +
    `Login URL: ${loginLink}\n` +
    `Your Login Email: ${email}\n` +
    `Temporary Password: ${tempPassword}\n\n` +
    `Important: This temporary password is valid for ${expiryHours} hours.\n` +
    `Upon your initial sign-in, you will be prompted to set your own secure permanent password.\n\n` +
    `If you have questions, please contact your administrator at ${adminEmail}.\n\n` +
    `Best regards,\nVelvix Operations Team`;

  const htmlMessage = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Velvix CRM Platform</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Employee Account Invitation</p>
      </div>

      <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <p style="font-size: 16px; margin-top: 0;">Hello <strong>${name || 'Team Member'}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">
          Your staff account has been set up on Velvix CRM${designation ? ` as <strong>${designation}</strong>` : ''}. Use the temporary credentials below to sign in and configure your permanent password.
        </p>

        <div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Login Email</p>
          <p style="margin: 0 0 14px 0; font-size: 16px; font-weight: 600; color: #0f172a;">${email}</p>
          
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Temporary Password</p>
          <p style="margin: 0; font-family: monospace; font-size: 18px; font-weight: 700; color: #4338ca; letter-spacing: 1px;">${tempPassword}</p>
        </div>

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${loginLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Log In to Velvix CRM</a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">Or navigate directly to:<br/><span style="word-break: break-all; color: #6366f1;">${loginLink}</span></p>
      </div>

      <div style="padding: 12px 16px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca; margin-bottom: 20px;">
        <p style="font-size: 13px; color: #991b1b; margin: 0; line-height: 1.5;">
          ⏳ <strong>First-Time Security Setup:</strong> This temporary password is valid for <strong>${expiryHours} hours</strong>. You will be automatically prompted to configure your permanent password immediately upon login.
        </p>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">
        If you have questions or need a new invite link, please contact <a href="mailto:${adminEmail}" style="color: #4f46e5;">${adminEmail}</a>
      </p>
    </div>
  `;

  return sendEmail({
    from: `"Employee Portal" <${senderEmail}>`,
    email,
    subject,
    message: textMessage,
    html: htmlMessage,
  });
};


