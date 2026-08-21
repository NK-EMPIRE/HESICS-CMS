export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category?: 'invitation' | 'task_assignment' | 'quotation' | 'invoice' | 'invoice_paid' | 'password_reset' | 'activity_log' | 'agreement_sign' | 'custom';
}

/**
 * Base Brand HTML Email Template Wrapper with Titanium Accent #77727E
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
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #D4D4D8;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0D0D11; border: 1px solid #1E1E26; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #181820; background: linear-gradient(180deg, #14141A 0%, #0D0D11 100%);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <img src="https://hub-hesics.vercel.app/assets/hesics-logo-white.png" alt="HESICS" width="40" height="40" style="display:block; margin-bottom:8px;" /><div style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF;">
                      HESICS<span style="color: #77727E;">.</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 600; color: #808090; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 2px;">
                      Business Operating System
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(119, 114, 126, 0.15); border: 1px solid rgba(119, 114, 126, 0.35); border-radius: 20px; font-size: 10px; font-weight: 600; color: #D4D4D8; text-transform: uppercase; letter-spacing: 0.05em;">
                      Make It Simple
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body -->
          <tr>
            <td style="padding: 36px; font-size: 14px; line-height: 1.6; color: #D4D4D8;">
              ${contentHtml}

              ${actionButton ? `
              <div style="margin-top: 32px; text-align: center;">
                <a href="${actionButton.url}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #77727E; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(119, 114, 126, 0.35); text-transform: none;">
                  ${actionButton.text} →
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; border-top: 1px solid #181820; background-color: #09090C; text-align: center; font-size: 11px; color: #606070; line-height: 1.5;">
              <div>This is an automated operational notification from <strong>HESICS OS</strong>.</div>
              <div style="margin-top: 4px;">Queries: <a href="mailto:hesics1@gmail.com" style="color: #77727E; text-decoration: none;">hesics1@gmail.com</a> &nbsp;&middot;&nbsp; <a href="https://hub-hesics.vercel.app" style="color: #77727E; text-decoration: none;">hub-hesics.vercel.app</a></div>
              <div style="margin-top: 12px; font-size: 10px; color: #404050;">© ${new Date().getFullYear()} HESICS. All rights reserved.</div>
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
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    category: 'custom',
  });
}

/**
 * 1. Provision Team Member Invitation Email
 */
export async function sendInvitationEmail(params: {
  to: string;
  recipientName: string;
  roleName: string;
  department: string;
}) {
  const htmlContent = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        You've Been Added to HESICS
      </h2>
      <p style="margin: 0; color: #A0A0B0; font-size: 13px;">
        Welcome aboard. Your enterprise account credentials and authorizations have been provisioned.
      </p>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #121217; border: 1px solid #1C1C24; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #707080;">Authorized Role</td>
        <td style="padding: 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #77727E; font-weight: 600;">${params.roleName}</td>
      </tr>
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #707080;">Department</td>
        <td style="padding: 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #FFFFFF; font-weight: 500;">${params.department}</td>
      </tr>
      <tr>
        <td style="padding: 16px; font-size: 12px; color: #707080;">Work Email</td>
        <td style="padding: 16px; font-size: 12px; color: #FFFFFF; font-family: monospace;">${params.to}</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #A0A0B0; margin: 0;">
      You can sign in securely with your Google Work Account or request a Magic Sign-In link at our portal.
    </p>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Welcome to HESICS OS',
    htmlContent,
    { text: 'Access HESICS Portal', url: 'https://hesics-cms.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: 'Welcome to HESICS — Organization Access Granted',
    html: finalHtml,
    category: 'invitation',
  });
}

/**
 * 2. Task & Client Touchpoint Follow-Up Assignment
 */
export async function sendTaskAssignmentEmail(params: {
  to: string;
  recipientName: string;
  taskTitle: string;
  clientName?: string;
  dueDate: string;
  activityType: string;
  outcomeNotes?: string;
}) {
  const htmlContent = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        New Action Follow-up Assigned
      </h2>
      <p style="margin: 0; color: #A0A0B0; font-size: 13px;">
        A scheduled action requires your attention.
      </p>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #121217; border: 1px solid #1C1C24; border-radius: 12px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #707080;">Action Type</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #77727E; font-weight: 600; text-transform: uppercase;">${params.activityType}</td>
      </tr>
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #707080;">Client Account</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #FFFFFF; font-weight: 500;">${params.clientName || 'General'}</td>
      </tr>
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #707080;">Target Due Date</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #1C1C24; font-size: 12px; color: #E5A83B; font-weight: 600; font-family: monospace;">${params.dueDate}</td>
      </tr>
    </table>

    ${params.outcomeNotes ? `
    <div style="background-color: #08080A; border: 1px solid #181820; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #C0C0D0; font-style: italic;">
      "${params.outcomeNotes}"
    </div>
    ` : ''}
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Task Assignment Notification',
    htmlContent,
    { text: 'View in Pipeline', url: 'https://hesics-cms.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: `[Action Required] ${params.taskTitle} — Due ${params.dueDate}`,
    html: finalHtml,
    category: 'task_assignment',
  });
}

/**
 * 3. Commercial Quotation Issued
 */
export async function sendQuotationEmail(params: {
  to: string;
  clientName: string;
  quoteNumber: string;
  totalAmount: number;
  validUntil: string;
}) {
  const formattedAmount = `₹${params.totalAmount.toLocaleString('en-IN')}`;

  const htmlContent = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        Commercial Quotation Issued
      </h2>
      <p style="margin: 0; color: #A0A0B0; font-size: 13px;">
        Formal quotation <strong>#${params.quoteNumber}</strong> prepared for ${params.clientName}.
      </p>
    </div>

    <div style="background-color: #121218; border: 1px solid #1E1E26; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #707080; letter-spacing: 0.1em; font-weight: 600;">Total Estimate</div>
      <div style="font-size: 28px; font-weight: 800; color: #77727E; margin: 6px 0; font-family: monospace;">${formattedAmount}</div>
      <div style="font-size: 11px; color: #808090;">Valid until ${params.validUntil}</div>
    </div>

    <p style="font-size: 13px; color: #A0A0B0; line-height: 1.6; margin: 0;">
      Please review the itemized scope and milestones. You may access your portal to accept the proposal or contact our executive team for commercial alignments.
    </p>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Commercial Quotation',
    htmlContent,
    { text: 'Review Quotation Online', url: 'https://hesics-cms.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: `Commercial Quotation #${params.quoteNumber} from HESICS`,
    html: finalHtml,
    category: 'quotation',
  });
}

/**
 * 4. Formal Tax Invoice Issued
 */
export async function sendInvoiceEmail(params: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
}) {
  const formattedAmount = `₹${params.totalAmount.toLocaleString('en-IN')}`;

  const htmlContent = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #FFFFFF;">
        Tax Invoice Issued
      </h2>
      <p style="margin: 0; color: #A0A0B0; font-size: 13px;">
        Invoice <strong>#${params.invoiceNumber}</strong> issued for ${params.clientName}.
      </p>
    </div>

    <div style="background-color: #121218; border: 1px solid #1E1E26; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #707080; letter-spacing: 0.1em; font-weight: 600;">Total Payable</div>
      <div style="font-size: 28px; font-weight: 800; color: #77727E; margin: 6px 0; font-family: monospace;">${formattedAmount}</div>
      <div style="font-size: 11px; color: #E5A83B; font-weight: 600;">Payment Due Date: ${params.dueDate}</div>
    </div>

    <p style="font-size: 13px; color: #A0A0B0; line-height: 1.6; margin: 0;">
      Please find the commercial particulars recorded. Electronic remittance details are listed on the document.
    </p>
  `;

  const finalHtml = wrapBrandEmailTemplate(
    'Tax Invoice',
    htmlContent,
    { text: 'Pay / View Invoice Online', url: 'https://hesics-cms.vercel.app' }
  );

  return sendEmail({
    to: params.to,
    subject: `Tax Invoice #${params.invoiceNumber} from HESICS — Due ${params.dueDate}`,
    html: finalHtml,
    category: 'invoice',
  });
}


/** Send Agreement Sign Link to Client */
export function buildAgreementSignEmail(clientName: string, agreementId: string, scope: string, expiryDate: string): EmailPayload {
  const signUrl = `https://hub-hesics.vercel.app/#/sign-agreement/${agreementId}`;
  return {
    to: '',
    subject: `[HESICS] Service Agreement for Your Signature — ${scope}`,
    category: 'agreement_sign',
    html: wrapBrandEmailTemplate(
      'Agreement Signing',
      `<p>Dear <strong style="color: #F4F4F6;">${clientName}</strong>,</p>
      <p>Your <strong>HESICS Service Agreement</strong> has been prepared and is ready for your formal review and digital signature.</p>
      <div style="background-color: #0A0A0E; border: 1px solid #1E1E28; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #77727E; margin-bottom: 6px;">Scope of Engagement</div>
        <div style="font-weight: 600; color: #F4F4F6;">${scope}</div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #77727E; margin: 12px 0 4px;">Valid Until</div>
        <div style="font-weight: 600; color: #F4F4F6;">${expiryDate}</div>
      </div>
      <p style="color: #A0A0B0;">Click the secure button below to review the full 4-page agreement, upload your KYC, draw your digital signature, and confirm execution. The process takes under 3 minutes.</p>`,
      { text: 'Review & Sign Agreement', url: signUrl }
    ),
  };
}

