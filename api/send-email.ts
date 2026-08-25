import nodemailer from 'nodemailer';

const json = (res: any, status: number, body: Record<string, unknown>) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
};

async function verifyFirebaseToken(req: any): Promise<boolean> {
  const authHeader = String(req.headers?.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!token || !apiKey) return false;

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data.users) && data.users.length > 0 && data.users[0].disabled !== true;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
  if (!(await verifyFirebaseToken(req))) return json(res, 401, { error: 'Authentication required.' });

  let bodyData = req.body;
  if (typeof bodyData === 'string') {
    try {
      bodyData = JSON.parse(bodyData);
    } catch {
      return json(res, 400, { error: 'Invalid JSON payload.' });
    }
  }

  const { to, subject, html, text } = bodyData || {};
  if (
    typeof to !== 'string' ||
    typeof subject !== 'string' ||
    typeof html !== 'string' ||
    to.length > 320 ||
    subject.length > 240 ||
    html.length > 200_000 ||
    (text !== undefined && typeof text !== 'string')
  ) {
    return json(res, 400, { error: 'Invalid email payload.' });
  }

  const recipients = to.split(',').map((value: string) => value.trim()).filter(Boolean);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (recipients.length === 0 || recipients.length > 5 || recipients.some((value: string) => !validEmail.test(value))) {
    return json(res, 400, { error: 'Invalid recipient address.' });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) return json(res, 503, { error: 'Email service is not configured.' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"HESICS" <${smtpUser}>`,
      to: recipients.join(', '),
      subject: subject.trim(),
      html,
      text: text || undefined,
    });

    return json(res, 200, { success: true });
  } catch (error) {
    console.error('Failed to send email:', error instanceof Error ? error.name : 'unknown_error');
    return json(res, 500, { error: 'Failed to dispatch email.' });
  }
}
