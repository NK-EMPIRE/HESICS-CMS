import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, subject, html, text } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required email fields (to, subject, html)' });
  }

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'hesics1@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!smtpPass) {
    console.warn('SMTP_PASS not set in environment variables. Email simulation logged.');
    return res.status(200).json({ success: true, simulated: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"HESICS" <${smtpUser}>`,
      to,
      subject,
      html,
      text: text || undefined,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return res.status(500).json({ error: error?.message || 'Failed to dispatch email' });
  }
}
