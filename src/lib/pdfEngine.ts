import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quotation, Organization, Client } from './types';
import { HESICS_LOGO_DARK_B64, HESICS_LOGO_WHITE_B64 } from './logoAssets';

export type TemplateType = 'titanium' | 'executive' | 'corporate' | 'commercial';

export interface PDFExportOptions {
  template?: TemplateType;
  organization?: Organization;
  client?: Client;
  customNotes?: string;
}

export const AVAILABLE_TEMPLATES: { id: TemplateType; name: string; description: string; badge: string }[] = [
  { id: 'titanium', name: 'Titanium Luxury', description: 'Deep slate with #77727E metallic accents & HESICS seal', badge: 'Recommended' },
  { id: 'executive', name: 'Executive Minimalist', description: 'Ultra-clean high-ticket monochrome with HESICS crest', badge: 'Executive' },
  { id: 'corporate', name: 'Corporate Enterprise', description: 'Formal structure with HSN tax breakdown & account coordinates', badge: 'Enterprise' },
  { id: 'commercial', name: 'Classic Commercial', description: 'Traditional layout for legal and audit compliance', badge: 'Commercial' },
];

/** Draw real HESICS logo image on PDF */
function addHesicsLogo(doc: jsPDF, x: number, y: number, w: number, dark = false) {
  try {
    const logoData = dark ? HESICS_LOGO_DARK_B64 : HESICS_LOGO_WHITE_B64;
    doc.addImage(logoData, 'PNG', x, y, w, w);
  } catch {
    // fallback: draw text
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HESICS', x, y + w * 0.6);
  }
}

/** Robust cross-browser PDF download */
export function downloadPDFDocument(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
  } catch { doc.save(filename); }
}

function buildHeader(doc: jsPDF, title: string, docNumber: string, org: Organization) {
  // Dark header bar
  doc.setFillColor(12, 12, 16);
  doc.rect(0, 0, 210, 36, 'F');
  // Accent line
  doc.setFillColor(119, 114, 126);
  doc.rect(0, 35.5, 210, 0.8, 'F');

  // White logo (for dark background)
  addHesicsLogo(doc, 14, 10, 16, false);

  // Org name
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(org.name || 'HESICS', 34, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 170);
  doc.text('MAKE IT SIMPLE', 34, 25);

  // Document type & number (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(244, 244, 246);
  doc.text(title, 194, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(160, 160, 170);
  doc.text(`# ${docNumber}`, 194, 26, { align: 'right' });
}

function buildMetaSection(doc: jsPDF, fromLines: string[], toLabel: string, toLines: string[], startY: number) {
  doc.setTextColor(110, 110, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', 16, startY);
  doc.text(toLabel, 110, startY);

  let yL = startY + 5;
  let yR = startY + 5;
  fromLines.forEach(line => {
    doc.setFont('helvetica', line === fromLines[0] ? 'bold' : 'normal');
    doc.setFontSize(line === fromLines[0] ? 9.5 : 8);
    doc.setTextColor(line === fromLines[0] ? 30 : 80, line === fromLines[0] ? 30 : 80, line === fromLines[0] ? 35 : 90);
    doc.text(line, 16, yL); yL += line === fromLines[0] ? 5 : 4.5;
  });
  toLines.forEach(line => {
    doc.setFont('helvetica', line === toLines[0] ? 'bold' : 'normal');
    doc.setFontSize(line === toLines[0] ? 9.5 : 8);
    doc.setTextColor(line === toLines[0] ? 30 : 80, line === toLines[0] ? 30 : 80, line === toLines[0] ? 35 : 90);
    doc.text(line, 110, yR); yR += line === toLines[0] ? 5 : 4.5;
  });
  return Math.max(yL, yR) + 4;
}

function buildTable(doc: jsPDF, items: any[], startY: number) {
  const rows = items.map((item, i) => [
    i + 1,
    item.description || 'Professional Deliverable',
    item.quantity || 1,
    `INR ${(Number(item.unit_price ?? item.rate) || 0).toLocaleString('en-IN')}`,
    `INR ${(Number(item.amount) || 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'Scope / Description', 'Qty', 'Unit Rate', 'Amount']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [12, 12, 16], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [218, 218, 224], textColor: [40, 40, 48] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
  });
  return (doc as any).lastAutoTable.finalY;
}

function buildTotals(doc: jsPDF, subtotal: number, tax: number, total: number, isTax: boolean, afterY: number) {
  const x = 120, h = isTax ? 30 : 22;
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(218, 218, 224);
  doc.roundedRect(x, afterY + 6, 74, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 90);
  doc.text('Subtotal:', x + 5, afterY + 14);
  doc.text(`INR ${subtotal.toLocaleString('en-IN')}`, x + 69, afterY + 14, { align: 'right' });
  let ty = afterY + 14;
  if (isTax) {
    ty += 7;
    doc.text('GST (18%):', x + 5, ty);
    doc.text(`INR ${tax.toLocaleString('en-IN')}`, x + 69, ty, { align: 'right' });
  }
  ty += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(12, 12, 16);
  doc.text('Total:', x + 5, ty);
  doc.setTextColor(119, 114, 126);
  doc.text(`INR ${total.toLocaleString('en-IN')}`, x + 69, ty, { align: 'right' });
  return afterY + 6 + h;
}

function buildFooter(doc: jsPDF) {
  doc.setDrawColor(218, 218, 224); doc.line(14, 280, 196, 280);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 140, 150);
  doc.text('HESICS Enterprise Suite  •  Make It Simple  •  hesics1@gmail.com  •  hub-hesics.vercel.app', 105, 284, { align: 'center' });
  doc.text('Confidential & Privileged Commercial Document', 105, 289, { align: 'center' });
}

export function generateInvoicePDF(invoice: Invoice, org: Organization, template: TemplateType = 'titanium'): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isTax = org.is_tax_enabled !== false;

  buildHeader(doc, 'TAX INVOICE', invoice.invoice_number, org);

  const fromLines = [org.name || 'HESICS', ...(org.email ? [`Email: ${org.email}`] : []), ...(org.address ? [org.address] : []), ...(isTax && org.gstin ? [`GSTIN: ${org.gstin}`] : [])];
  const toLines = [invoice.client_name || 'Client', ...(invoice.client_email ? [`Email: ${invoice.client_email}`] : []), `Issue Date: ${invoice.issue_date || new Date().toISOString().split('T')[0]}`, `Due: ${invoice.due_date || 'On Receipt'}`, `Status: ${(invoice.status || 'SENT').toUpperCase()}`];

  const tableStartY = buildMetaSection(doc, fromLines, 'BILLED TO:', toLines, 44);
  const tableEndY = buildTable(doc, invoice.line_items || invoice.items || [], tableStartY + 4);
  buildTotals(doc, Number(invoice.subtotal) || 0, Number(invoice.tax) || 0, Number(invoice.total) || 0, isTax, tableEndY);

  // Terms
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 110);
  doc.text('PAYMENT TERMS:', 16, tableEndY + 14);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 120);
  ['1. Payment within due date via RTGS / NEFT / Wire Transfer.', '2. Reference this invoice number on all remittances.', '3. Generated by HESICS Business Operating System.'].forEach((t, i) => {
    doc.text(t, 16, tableEndY + 20 + i * 4.5);
  });

  buildFooter(doc);
  return doc;
}

export function generateQuotationPDF(quote: Quotation, org: Organization, template: TemplateType = 'titanium'): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isTax = org.is_tax_enabled !== false;

  buildHeader(doc, 'QUOTATION', quote.quotation_number || quote.quote_number || 'QT-001', org);

  const fromLines = [org.name || 'HESICS', ...(org.email ? [`Email: ${org.email}`] : []), ...(org.address ? [org.address] : []), ...(isTax && org.gstin ? [`GSTIN: ${org.gstin}`] : [])];
  const toLines = [quote.client_name || 'Client', ...(quote.client_email ? [`Email: ${quote.client_email}`] : []), `Issue Date: ${quote.issue_date || new Date().toISOString().split('T')[0]}`, `Valid Until: ${quote.valid_until || quote.expiry_date || '30 Days'}`, `Status: ${(quote.status || 'DRAFT').toUpperCase()}`];

  const tableStartY = buildMetaSection(doc, fromLines, 'PREPARED FOR:', toLines, 44);
  const tableEndY = buildTable(doc, quote.line_items || quote.items || [], tableStartY + 4);
  buildTotals(doc, Number(quote.subtotal) || 0, Number(quote.tax) || 0, Number(quote.total) || 0, isTax, tableEndY);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 110);
  doc.text('ESTIMATE TERMS:', 16, tableEndY + 14);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 120);
  [`1. Valid until ${quote.valid_until || quote.expiry_date || '30 days from issuance'}.`, '2. Deliverables commence upon formal sign-off and advance payment.', '3. Generated by HESICS Business Operating System.'].forEach((t, i) => {
    doc.text(t, 16, tableEndY + 20 + i * 4.5);
  });

  buildFooter(doc);
  return doc;
}

/** Monthly Income Report PDF */
export function generateIncomeReportPDF(entries: any[], org: Organization, month: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  buildHeader(doc, 'INCOME REPORT', month, org);

  const total = entries.reduce((s, e) => s + Number(e.amount || 0), 0);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Client / Source', 'Category', 'Method', 'Date', 'Amount (INR)']],
    body: entries.map((e, i) => [i + 1, e.client_name || e.source_type, e.category, e.payment_method || '-', e.received_at || '-', Number(e.amount || 0).toLocaleString('en-IN')]),
    theme: 'grid',
    headStyles: { fillColor: [12, 12, 16], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [218, 218, 224] },
    columnStyles: { 5: { halign: 'right' } },
  });

  const endY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFillColor(12, 12, 16); doc.roundedRect(120, endY, 74, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(244, 244, 246);
  doc.text('Total Revenue:', 125, endY + 9);
  doc.setTextColor(119, 114, 126);
  doc.text(`INR ${total.toLocaleString('en-IN')}`, 190, endY + 9, { align: 'right' });

  buildFooter(doc);
  return doc;
}

/** Monthly Expense Report PDF */
export function generateExpenseReportPDF(entries: any[], org: Organization, month: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  buildHeader(doc, 'EXPENSE REPORT', month, org);

  const total = entries.reduce((s, e) => s + Number(e.amount || 0), 0);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Vendor / Description', 'Category', 'GST Paid', 'Date', 'Amount (INR)']],
    body: entries.map((e, i) => [i + 1, e.vendor || e.category, e.category, e.gst_paid ? `INR ${Number(e.gst_paid).toLocaleString('en-IN')}` : '-', e.spent_at || e.date || '-', Number(e.amount || 0).toLocaleString('en-IN')]),
    theme: 'grid',
    headStyles: { fillColor: [12, 12, 16], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [218, 218, 224] },
    columnStyles: { 5: { halign: 'right' } },
  });

  const endY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFillColor(12, 12, 16); doc.roundedRect(120, endY, 74, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(244, 244, 246);
  doc.text('Total Expenditure:', 125, endY + 9);
  doc.setTextColor(119, 114, 126);
  doc.text(`INR ${total.toLocaleString('en-IN')}`, 190, endY + 9, { align: 'right' });

  buildFooter(doc);
  return doc;
}

/** Agreement PDF - filled with client details + signature */
export function generateAgreementPDF(agreement: {
  clientName: string; clientEmail: string; clientPhone: string;
  clientCompany?: string; panCard?: string; aadhaarNumber?: string;
  scope: string[]; signatureDataUrl?: string; photoDataUrl?: string;
  agreementId: string; signedAt: string; org: Organization;
}): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // PAGE 1: Cover & Parties
  buildHeader(doc, 'SERVICE AGREEMENT', `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, agreement.org);

  // Client photo (top-right)
  if (agreement.photoDataUrl) {
    try { doc.addImage(agreement.photoDataUrl, 'JPEG', 160, 42, 28, 28); } catch {}
  }

  let y = 44;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(12, 12, 16);
  doc.text('PARTIES TO THIS AGREEMENT', 16, y); y += 7;

  const rows = [
    ['Service Provider', agreement.org.name || 'HESICS', agreement.org.email || 'hesics1@gmail.com'],
    ['Client', agreement.clientName, agreement.clientEmail],
    ['Client Company', agreement.clientCompany || 'Individual / Business', agreement.clientPhone],
    ['PAN / Aadhaar', agreement.panCard || 'Verified', agreement.aadhaarNumber || '—'],
    ['Agreement ID', `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, `Signed: ${new Date(agreement.signedAt).toLocaleString()}`],
  ];

  autoTable(doc, {
    startY: y, head: [['Role', 'Name / Entity', 'Contact / Reference']],
    body: rows, theme: 'grid',
    headStyles: { fillColor: [12, 12, 16], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [218, 218, 224] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // PAGE 2: Scope of Work
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(12, 12, 16);
  doc.text('SCOPE OF SERVICES', 16, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 60);
  agreement.scope.forEach((item, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${item}`, 178);
    doc.text(lines, 16, y); y += lines.length * 5 + 1;
    if (y > 260) { doc.addPage(); buildHeader(doc, 'SERVICE AGREEMENT', `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, agreement.org); y = 44; }
  });
  y += 4;

  // PAGE 3: T&C
  if (y > 200) { doc.addPage(); buildHeader(doc, 'SERVICE AGREEMENT', `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, agreement.org); y = 44; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(12, 12, 16);
  doc.text('TERMS & CONDITIONS', 16, y); y += 6;
  const tcs = [
    'Payment Terms: All fees are payable within agreed milestones. Delayed payments attract 2% monthly interest.',
    'Confidentiality: Both parties shall maintain strict confidentiality of all proprietary and commercial information.',
    'Intellectual Property: All deliverables remain the exclusive property of Client upon full payment settlement.',
    'Termination: Either party may terminate with 30 days written notice. Completed milestones are non-refundable.',
    'Dispute Resolution: Disputes shall be resolved through arbitration in Chennai, Tamil Nadu, India.',
    'Governing Law: This Agreement is governed by the laws of India, including the Information Technology Act, 2000.',
    'Force Majeure: Neither party shall be liable for delays caused by circumstances beyond reasonable control.',
    'Amendment: Any modifications to this Agreement require written consent from both parties.',
  ];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(50, 50, 60);
  tcs.forEach((tc, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${tc}`, 178);
    doc.text(lines, 16, y); y += lines.length * 4.5 + 1;
    if (y > 265) { doc.addPage(); buildHeader(doc, 'SERVICE AGREEMENT', `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, agreement.org); y = 44; }
  });
  y += 6;

  // Signature Section
  if (y > 230) { doc.addPage(); buildHeader(doc, 'SERVICE AGREEMENT', `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, agreement.org); y = 44; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(12, 12, 16);
  doc.text('DIGITAL EXECUTION & CONSENT', 16, y); y += 8;

  // Client signature box
  doc.setDrawColor(119, 114, 126); doc.setLineWidth(0.5);
  doc.rect(16, y, 82, 32);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(110, 110, 120);
  doc.text('CLIENT DIGITAL SIGNATURE', 57, y + 4, { align: 'center' });
  if (agreement.signatureDataUrl) {
    try { doc.addImage(agreement.signatureDataUrl, 'PNG', 20, y + 6, 74, 20); } catch {}
  }
  doc.text(agreement.clientName, 57, y + 29, { align: 'center' });

  // HESICS authorized seal
  doc.rect(112, y, 82, 32);
  doc.text('AUTHORIZED BY HESICS', 153, y + 4, { align: 'center' });
  addHesicsLogo(doc, 139, y + 6, 20, true);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(12, 12, 16);
  doc.text('HESICS', 153, y + 30, { align: 'center' });

  y += 40;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 140, 150);
  doc.text(`Electronically signed on ${new Date(agreement.signedAt).toLocaleString()} | Agreement ID: AGR-${agreement.agreementId.slice(-6).toUpperCase()}`, 105, y, { align: 'center' });
  doc.text('This digital agreement is legally binding under the Information Technology Act, 2000 (India).', 105, y + 4, { align: 'center' });

  buildFooter(doc);
  return doc;
}
