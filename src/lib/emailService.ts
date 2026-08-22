export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category?: 'invitation' | 'task_assignment' | 'quotation' | 'invoice' | 'invoice_paid' | 'password_reset' | 'activity_log' | 'agreement_sign' | 'custom';
}

/**
 * Original Luxury Dark Email Template matching user's original screenshot exactly
 */
export function wrapBrandEmailTemplate(title: string, contentHtml: string, actionButton?: { text: string; url: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08080B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #D4D4D8;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #08080B; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0F0F14; border: 1px solid #1C1C26; border-radius: 20px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.6);">
          
          <!-- Header Banner with Titanium Styling -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #1C1C26; background-color: #0F0F14;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle">
                    <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF;">
                      HESICS<span style="color: #77727E;">.</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 700; color: #707080; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px;">
                      BUSINESS OPERATING SYSTEM
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 10px; border: 1px solid #282836; background-color: #14141C; border-radius: 9999px; font-size: 10px; font-weight: 700; color: #9A9AA8; text-transform: uppercase; letter-spacing: 0.08em;">
                      MAKE IT SIMPLE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body -->
          <tr>
            <td style="padding: 36px; font-size: 14px; line-height: 1.65; color: #D4D4D8;">
              ${contentHtml}

              ${actionButton ? `
              <div style="margin-top: 32px; text-align: center;">
                <a href="${actionButton.url}" target="_blank" style="display: inline-block; padding: 13px 32px; background-color: #77727E; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 16px rgba(119, 114, 126, 0.35);">
                  ${actionButton.text} →
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; border-top: 1px solid #1C1C26; background-color: #0A0A0E; text-align: center; font-size: 11px; color: #606070; line-height: 1.5;">
              <div>Official notification from <strong>HESICS</strong>.</div>
              <div style="margin-top: 4px;">Support: <a href="mailto:hesics1@gmail.com" style="color: #77727E; text-decoration: none;">hesics1@gmail.com</a> &nbsp;&middot;&nbsp; <a href="https://hub-hesics.vercel.app" style="color: #77727E; text-decoration: none;">hub-hesics.vercel.app</a></div>
              <div style="margin-top: 8px; font-size: 10px; color: #40404C;">© ${new Date().getFullYear()} HESICS. All rights reserved.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Dispatch email via backend API endpoint
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Failed to send email (${res.status})` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Email Dispatch Failure:', err);
    return { success: false, error: err?.message || 'Network error while attempting to send email.' };
  }
}

export async function sendCustomEmail(params: {
  to: string;
  subject: string;
  message?: string;
  html?: string;
  text?: string;
  recipientName?: string;
  actionUrl?: string;
  actionLabel?: string;
  category?: EmailPayload['category'];
}): Promise<{ success: boolean; error?: string }> {
  let finalHtml = params.html;
  if (!finalHtml && params.message) {
    const recipient = params.recipientName || 'Member';
    let cleanMessage = params.message.trim();
    // Prevent duplicate Dear greeting lines
    const hasGreeting = cleanMessage.toLowerCase().startsWith('dear ');
    const greetingHeader = hasGreeting ? '' : `<p style="margin: 0 0 16px 0;">Dear <strong style="color: #FFFFFF;">${recipient}</strong>,</p>`;

    const contentHtml = greetingHeader +
      `<div style="background-color: #121218; border: 1px solid #1E1E2A; border-radius: 14px; padding: 20px; margin: 16px 0; color: #D4D4D8; line-height: 1.65; white-space: pre-wrap;">` +
      cleanMessage +
      `</div>`;

    const actionBtn = params.actionUrl ? { text: params.actionLabel || 'View Document', url: params.actionUrl } : undefined;
    finalHtml = wrapBrandEmailTemplate(params.subject, contentHtml, actionBtn);
  }

  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: finalHtml || params.message || '',
    text: params.text,
    category: params.category || 'custom',
  });
}

/**
 * 1. Provision Team Member Invitation Email with Password Setup Link
 */
export async function sendInvitationEmail(params: {
  to: string;
  recipientName: string;
  roleName: string;
  department: string;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hub-hesics.vercel.app';
  const setupPasswordUrl = `${origin}?mode=setup_password&email=${encodeURIComponent(params.to)}`;

  const htmlContent = `
    <div style="margin-bottom: 22px;">
      <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        You've Been Added to HESICS
      </h2>
      <p style="margin: 0; color: #8A8A98; font-size: 13px;">
        Welcome aboard. Your enterprise account credentials and authorizations have been provisioned.
      </p>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #121218; border: 1px solid #1E1E2A; border-radius: 12px; margin-bottom: 22px;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #1E1E2A; font-size: 12px; color: #707080;">Authorized Role</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #1E1E2A; font-size: 12px; color: #77727E; font-weight: 600;">${params.roleName}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #1E1E2A; font-size: 12px; color: #707080;">Department</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #1E1E2A; font-size: 12px; color: #FFFFFF; font-weight: 500;">${params.department}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; font-size: 12px; color: #707080;">Work Email</td>
        <td style="padding: 14px 18px; font-size: 12px; color: #FFFFFF; font-family: monospace;">${params.to}</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #9A9AA8; margin: 0 0 16px 0;">
      Please click below to set up your password and access the HESICS Operating System.
    </p>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Welcome to HESICS',
    htmlContent,
    { text: 'Set Up Password & Sign In', url: setupPasswordUrl }
  );

  return sendEmail({
    to: params.to,
    subject: 'Welcome to HESICS — Organization Access Granted',
    html: finalHtml,
    category: 'invitation',
  });
}

/**
 * 2. Quotation Proposal Dispatch Email
 */
export async function sendQuotationEmail(params: {
  to: string;
  clientName: string;
  quotationNumber: string;
  amount: number;
  validUntil: string;
  scope: string;
}) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(params.amount);

  const htmlContent = `
    <div style="margin-bottom: 22px;">
      <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        Commercial Proposal #${params.quotationNumber}
      </h2>
      <p style="margin: 0; color: #8A8A98; font-size: 13px;">
        Dear <strong style="color: #FFFFFF;">${params.clientName}</strong>, please find your quotation from HESICS.
      </p>
    </div>

    <div style="background-color: #121218; border: 1px solid #1E1E2A; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 22px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #707080; font-weight: 600;">Total Estimate</div>
      <div style="font-size: 26px; font-weight: 800; color: #77727E; margin: 6px 0;">${formattedAmount}</div>
      <div style="font-size: 11px; color: #8A8A98;">Valid Until: ${params.validUntil}</div>
    </div>

    <p style="font-size: 13px; color: #9A9AA8; margin: 0;">
      Scope: <strong>${params.scope}</strong>
    </p>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Quotation Proposal',
    htmlContent,
    { text: 'View Quotation Details', url: 'https://hub-hesics.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: `Quotation #${params.quotationNumber} from HESICS`,
    html: finalHtml,
    category: 'quotation',
  });
}

/**
 * 3. Tax Invoice Notice Email
 */
export async function sendInvoiceEmail(params: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
}) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(params.amount);

  const htmlContent = `
    <div style="margin-bottom: 22px;">
      <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        Tax Invoice #${params.invoiceNumber}
      </h2>
      <p style="margin: 0; color: #8A8A98; font-size: 13px;">
        Dear <strong style="color: #FFFFFF;">${params.clientName}</strong>, thank you for your business with HESICS.
      </p>
    </div>

    <div style="background-color: #121218; border: 1px solid #1E1E2A; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 22px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #707080; font-weight: 600;">Total Due</div>
      <div style="font-size: 26px; font-weight: 800; color: #77727E; margin: 6px 0;">${formattedAmount}</div>
      <div style="font-size: 11px; color: #8A8A98;">Due Date: ${params.dueDate}</div>
    </div>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Tax Invoice',
    htmlContent,
    { text: 'View Invoice', url: 'https://hub-hesics.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: `Invoice #${params.invoiceNumber} from HESICS`,
    html: finalHtml,
    category: 'invoice',
  });
}

/**
 * 4. Task & Client Touchpoint Follow-Up Assignment
 */
export async function sendTaskAssignmentEmail(params: {
  to: string;
  recipientName: string;
  taskTitle: string;
  clientName?: string;
  dueDate: string;
  activityType?: string;
  outcomeNotes?: string;
}) {
  const htmlContent = `
    <div style="margin-bottom: 22px;">
      <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        Action Item: ${params.taskTitle}
      </h2>
      <p style="margin: 0; color: #8A8A98; font-size: 13px;">
        Dear <strong style="color: #FFFFFF;">${params.recipientName}</strong>, an item has been assigned for your follow-up.
      </p>
    </div>

    <div style="background-color: #121218; border: 1px solid #1E1E2A; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
      <div style="font-size: 12px; color: #8A8A98; margin-bottom: 6px;">Target Date: <strong style="color: #FFFFFF;">${params.dueDate}</strong></div>
      ${params.clientName ? `<div style="font-size: 12px; color: #8A8A98;">Client: <strong style="color: #FFFFFF;">${params.clientName}</strong></div>` : ''}
    </div>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Task Assignment',
    htmlContent,
    { text: 'Open Workspace', url: 'https://hub-hesics.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: `Task: ${params.taskTitle} — HESICS`,
    html: finalHtml,
    category: 'task_assignment',
  });
}

/**
 * 5. Send Agreement Sign Link to Client
 */
export function buildAgreementSignEmail(clientName: string, agreementId: string, scope: string, expiryDate: string): EmailPayload {
  const signUrl = `https://hub-hesics.vercel.app/#/sign-agreement/${agreementId}`;
  return {
    to: '',
    subject: `Service Agreement for Your Review & Signature — HESICS`,
    category: 'agreement_sign',
    html: wrapBrandEmailTemplate(
      'Service Agreement',
      `<p>Dear <strong style="color: #FFFFFF;">${clientName}</strong>,</p>
      <p>Your <strong>HESICS Service Agreement</strong> is ready for your review and digital signature.</p>
      <div style="background-color: #121218; border: 1px solid #1E1E2A; border-radius: 12px; padding: 18px; margin: 18px 0;">
        <div style="font-size: 11px; text-transform: uppercase; color: #707080; margin-bottom: 4px;">Scope</div>
        <div style="font-weight: 600; color: #FFFFFF;">${scope}</div>
      </div>
      <p style="color: #9A9AA8;">Click below to review the agreement and confirm your digital signature.</p>`,
      { text: 'Review & Sign Agreement', url: signUrl }
    ),
  };
}
