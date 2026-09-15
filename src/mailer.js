const nodemailer = require('nodemailer');

function createMailer(env = process.env) {
  const requiredSettings = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingSettings = requiredSettings.filter((setting) => !env[setting]);

  if (missingSettings.length > 0) {
    throw new Error(`Missing email configuration: ${missingSettings.join(', ')}`);
  }

  const port = Number(env.SMTP_PORT || 587);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE === 'true' || port === 465,
    tls: {
      rejectUnauthorized: env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  async function sendOtpEmail({ to, code, expiresAt, isResend }) {
    const expiry = new Date(expiresAt).toISOString();
    const subject = isResend ? 'Your OTP has been resent' : 'Your OTP code';

    await transporter.sendMail({
      from: env.MAIL_FROM || env.SMTP_USER,
      to,
      subject,
      text: `Your one-time password is ${code}. It expires at ${expiry}. This code can only be used once.`,
    });
  }

  return { sendOtpEmail };
}

module.exports = { createMailer };