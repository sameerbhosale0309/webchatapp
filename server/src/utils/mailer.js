import nodemailer from 'nodemailer';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export function isGmail(email) {
  if (!email || typeof email !== 'string') return false;
  return GMAIL_REGEX.test(email.trim());
}

export async function sendOtpEmail(email, otp, purpose = 'register') {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSmtpKey = process.env.BREVO_SMTP_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  const titleText = purpose === 'login' ? 'LOGIN VERIFICATION CODE' : 'REGISTRATION VERIFICATION CODE';
  const subject = purpose === 'login'
    ? `🔑 [Varta-लाप] Login Verification Code: ${otp}`
    : `✨ [Varta-लाप] Registration Verification Code: ${otp}`;

  const htmlContent = `
    <div style="font-family: monospace, Courier, sans-serif; background-color: #1c1817; color: #f4eae0; padding: 28px; border-radius: 6px; border: 2px solid #3c3431; max-width: 500px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #f97316; margin: 0; font-size: 20px; letter-spacing: 2px;">Varta-लाप SECURITY TELEMETRY</h2>
        <span style="font-size: 11px; color: #a89f91;">BREVO AUTOMATED AUTHENTICATION DISPATCH</span>
      </div>
      
      <p style="font-size: 13px; line-height: 1.5; color: #f4eae0;">
        Your 6-digit security code for <strong>${titleText}</strong> is:
      </p>

      <div style="background-color: #282220; padding: 20px; border: 2px solid #f97316; text-align: center; border-radius: 4px; margin: 20px 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; font-family: monospace;">${otp}</span>
      </div>

      <p style="font-size: 11px; color: #a89f91; line-height: 1.4;">
        This key is valid for <strong>10 minutes</strong>. Only genuine Google (@gmail.com) email addresses are processed. If you did not request this key, please ignore this transmission.
      </p>

      <div style="border-top: 1px solid #3c3431; margin-top: 24px; padding-top: 12px; text-align: center;">
        <span style="font-size: 10px; color: #807669; text-transform: uppercase;">[ Varta-लाप Brevo Transactional Email Engine ]</span>
      </div>
    </div>
  `;

  // Dev Console Telemetry Log
  console.log(`\n==================================================`);
  console.log(`[BREVO GMAIL OTP TELEMETRY DISPATCH]`);
  console.log(`TO: ${email}`);
  console.log(`PURPOSE: ${purpose.toUpperCase()}`);
  console.log(`VERIFICATION OTP CODE: [ ${otp} ]`);
  console.log(`==================================================\n`);

  // Attempt 1: Brevo Transactional Email REST API
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Varta-लाप Security',
            email: senderEmail,
          },
          to: [{ email: email }],
          subject: subject,
          htmlContent: htmlContent,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[BREVO API SUCCESS] Email dispatched to ${email} (MessageID: ${result.messageId})`);
        return true;
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`[BREVO API NOTICE] Brevo API status ${response.status}: ${JSON.stringify(errJson)}. Falling back to Brevo Nodemailer SMTP...`);
      }
    } catch (apiErr) {
      console.warn(`[BREVO API EXCEPTION] ${apiErr.message}. Falling back to Brevo Nodemailer SMTP...`);
    }
  }

  // Attempt 2: Brevo SMTP via Nodemailer
  if (brevoSmtpKey) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: senderEmail,
          pass: brevoSmtpKey,
        },
      });

      await transporter.sendMail({
        from: `"Varta-लाप Security" <${senderEmail}>`,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[BREVO SMTP SUCCESS] Verification email sent to ${email} via Nodemailer Brevo SMTP.`);
      return true;
    } catch (smtpErr) {
      console.error(`[BREVO SMTP ERROR] Failed to send via Brevo SMTP to ${email}:`, smtpErr.message);
    }
  }

  return true;
}
