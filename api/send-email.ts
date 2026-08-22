import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  let bodyData = req.body;
  if (typeof bodyData === 'string') {
    try { bodyData = JSON.parse(bodyData); } catch {}
  }

  const { to, subject, html, text } = bodyData || {};

  if (!to || !subject || !html) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing required email fields (to, subject, html)' }));
  }

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'hesics1@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'fqvtdbtzbuqfikfn';

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

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('Failed to send email:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: error?.message || 'Failed to dispatch email' }));
  }
}
