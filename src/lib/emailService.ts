export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category?: 'invitation' | 'task_assignment' | 'quotation' | 'invoice' | 'password_reset' | 'activity_log';
}

/**
 * Base Brand HTML Email Template Wrapper
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
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #181820; background: linear-gradient(180deg, #121218 0%, #0D0D11 100%);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF;">
                      HESICS<span style="color: #1E9EFF;">.</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 600; color: #707080; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 2px;">
                      Business Operating System
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(30, 158, 255, 0.1); border: 1px solid rgba(30, 158, 255, 0.3); border-radius: 20px; font-size: 10px; font-weight: 600; color: #1E9EFF; text-transform: uppercase; letter-spacing: 0.05em;">
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
                <a href="${actionButton.url}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #1E9EFF; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(30, 158, 255, 0.35); text-transform: none;">
                  ${actionButton.text} →
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; border-top: 1px solid #181820; background-color: #09090C; text-align: center; font-size: 11px; color: #505060; line-height: 1.5;">
              <div>This is an automated operational notification from <strong>HESICS OS</strong>.</div>
              <div style="margin-top: 4px;">Direct queries to <a href="mailto:hesics1@gmail.com" style="color: #1E9EFF; text-decoration: none;">hesics1@gmail.com</a></div>
              <div style="margin-top: 12px; font-size: 10px; color: #353540;">© ${new Date().getFullYear()} HESICS. All rights reserved.</div>
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
    console.error('Email sending error:', err);
    return { success: false, error: err.message || 'Network error while dispatching email.' };
  }
}

// ─── High-Ticket Email Template Generators ──────────────────────────────────────

/**
 * 1. Team Member Invitation / Account Provisioning
 */
export async function sendInvitationEmail(params: {
  to: string;
  recipientName: string;
  roleName: string;
  department?: string;
  loginUrl?: string;
}) {
  const loginUrl = params.loginUrl || window.location.origin;
  const content = `
    <h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">Welcome to HESICS, ${params.recipientName}</h2>
    <p style="margin: 0 0 16px;">You have been officially invited and provisioned into the <strong>HESICS Business Operating System</strong>.</p>
    
    <div style="background-color: #08080B; border: 1px solid #1A1A22; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px;">
        <tr>
          <td style="color: #707080; width: 120px;">Role Assigned:</td>
          <td style="color: #1E9EFF; font-weight: 600;">${params.roleName}</td>
        </tr>
        <tr>
          <td style="color: #707080;">Department:</td>
          <td style="color: #FFFFFF;">${params.department || 'Operations'}</td>
        </tr>
        <tr>
          <td style="color: #707080;">Authorized Email:</td>
          <td style="color: #FFFFFF; font-family: monospace;">${params.to}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 8px; font-size: 13px; color: #9090A0;">You can sign in directly using Google Single Sign-On or request a passwordless Magic Link with your authorized work email.</p>
  `;

  return sendEmail({
    to: params.to,
    subject: `Welcome to HESICS — You're invited to join as ${params.roleName}`,
    html: wrapBrandEmailTemplate('Welcome to HESICS', content, { text: 'Enter Workspace', url: loginUrl }),
    category: 'invitation',
  });
}

/**
 * 2. Task / Activity Assigned Notification
 */
export async function sendTaskAssignmentEmail(params: {
  to: string;
  recipientName: string;
  taskTitle: string;
  clientName?: string;
  dueDate?: string;
  activityType: string;
  outcomeNotes?: string;
  taskUrl?: string;
}) {
  const url = params.taskUrl || `${window.location.origin}`;
  const content = `
    <h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">New Scheduled Action Assigned</h2>
    <p style="margin: 0 0 16px;">Hi ${params.recipientName}, a new client action has been logged in HESICS requiring your attention.</p>
    
    <div style="background-color: #08080B; border: 1px solid #1A1A22; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px;">
        <tr>
          <td style="color: #707080; width: 120px;">Activity Type:</td>
          <td style="color: #1E9EFF; font-weight: 600; text-transform: uppercase;">${params.activityType}</td>
        </tr>
        ${params.clientName ? `
        <tr>
          <td style="color: #707080;">Client Account:</td>
          <td style="color: #FFFFFF; font-weight: 600;">${params.clientName}</td>
        </tr>` : ''}
        ${params.dueDate ? `
        <tr>
          <td style="color: #707080;">Follow-Up Due:</td>
          <td style="color: #FBBF24; font-family: monospace;">${params.dueDate}</td>
        </tr>` : ''}
        ${params.outcomeNotes ? `
        <tr>
          <td style="color: #707080; vertical-align: top;">Notes:</td>
          <td style="color: #D4D4D8;">${params.outcomeNotes}</td>
        </tr>` : ''}
      </table>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `[Action Required] ${params.activityType.toUpperCase()}: ${params.clientName || 'Client Follow-Up'}`,
    html: wrapBrandEmailTemplate('Task Assignment', content, { text: 'View in HESICS', url }),
    category: 'task_assignment',
  });
}

/**
 * 3. Quotation Issued to Client
 */
export async function sendQuotationEmail(params: {
  to: string;
  clientName: string;
  quoteNumber: string;
  totalAmount: number;
  validUntil?: string;
  quoteUrl?: string;
}) {
  const url = params.quoteUrl || window.location.origin;
  const content = `
    <h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">Price Quotation & Scope Estimate</h2>
    <p style="margin: 0 0 16px;">Dear ${params.clientName},</p>
    <p style="margin: 0 0 16px;">Thank you for your interest in partnering with HESICS. Your formal quotation <strong>#${params.quoteNumber}</strong> is ready for review.</p>
    
    <div style="background-color: #08080B; border: 1px solid #1A1A22; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 11px; color: #707080; text-transform: uppercase; letter-spacing: 0.1em;">Total Estimate</div>
      <div style="font-size: 28px; font-weight: 800; color: #1E9EFF; margin: 6px 0; font-family: monospace;">
        ₹${params.totalAmount.toLocaleString('en-IN')}
      </div>
      ${params.validUntil ? `
      <div style="font-size: 11px; color: #9090A0;">Valid until ${params.validUntil}</div>
      ` : ''}
    </div>

    <p style="margin: 0; font-size: 13px; color: #9090A0;">Our team is available to discuss milestones and address any technical specifications.</p>
  `;

  return sendEmail({
    to: params.to,
    subject: `Quotation #${params.quoteNumber} from HESICS — ₹${params.totalAmount.toLocaleString('en-IN')}`,
    html: wrapBrandEmailTemplate('Quotation Issued', content, { text: 'Review Quotation', url }),
    category: 'quotation',
  });
}

/**
 * 4. Tax Invoice Notification
 */
export async function sendInvoiceEmail(params: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  invoiceUrl?: string;
}) {
  const url = params.invoiceUrl || window.location.origin;
  const content = `
    <h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">Tax Invoice Issued</h2>
    <p style="margin: 0 0 16px;">Dear ${params.clientName},</p>
    <p style="margin: 0 0 16px;">Please find below the billing details for Tax Invoice <strong>#${params.invoiceNumber}</strong>.</p>
    
    <div style="background-color: #08080B; border: 1px solid #1A1A22; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 11px; color: #707080; text-transform: uppercase; letter-spacing: 0.1em;">Total Amount Due</div>
      <div style="font-size: 28px; font-weight: 800; color: #1E9EFF; margin: 6px 0; font-family: monospace;">
        ₹${params.totalAmount.toLocaleString('en-IN')}
      </div>
      <div style="font-size: 12px; color: #F87171; font-weight: 600; margin-top: 4px;">Payment Due: ${params.dueDate}</div>
    </div>

    <p style="margin: 0; font-size: 13px; color: #9090A0;">Thank you for your business. Please remit payment via direct bank transfer as specified in your invoice document.</p>
  `;

  return sendEmail({
    to: params.to,
    subject: `Tax Invoice #${params.invoiceNumber} from HESICS — ₹${params.totalAmount.toLocaleString('en-IN')}`,
    html: wrapBrandEmailTemplate('Tax Invoice Issued', content, { text: 'View & Download Invoice', url }),
    category: 'invoice',
  });
}