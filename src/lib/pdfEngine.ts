import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quotation, Organization, Client } from './types';

export type TemplateType = 'titanium' | 'executive' | 'corporate' | 'commercial';

export interface PDFExportOptions {
  template?: TemplateType;
  organization?: Organization;
  client?: Client;
  customNotes?: string;
}

export const AVAILABLE_TEMPLATES: { id: TemplateType; name: string; description: string; badge: string }[] = [
  { id: 'titanium', name: 'Titanium Luxury (Default)', description: 'Deep slate typography with #77727E metallic accents & verified security seal', badge: 'Recommended' },
  { id: 'executive', name: 'Executive Minimalist', description: 'Ultra-clean high-ticket monochrome styling with generous whitespace & HESICS crest', badge: 'Executive' },
  { id: 'corporate', name: 'Corporate Enterprise', description: 'Formal commercial structure with HSN tax breakdown & account coordinates', badge: 'Enterprise' },
  { id: 'commercial', name: 'Classic Commercial', description: 'Traditional multi-itemized layout designed for legal and audit compliance', badge: 'Commercial' },
];

/**
 * Draw crisp geometric vector HESICS emblem
 */
function drawHesicsLogo(doc: jsPDF, x: number, y: number, size: number = 10, isLight: boolean = false) {
  // Outer shield / rounded square container
  doc.setFillColor(isLight ? 24 : 12, isLight ? 24 : 12, isLight ? 28 : 16);
  doc.roundedRect(x, y, size, size, 2, 2, 'F');

  // Titanium metallic border
  doc.setDrawColor(119, 114, 126);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, size, size, 2, 2, 'S');

  // Vector letter 'H' / geometric core
  doc.setFillColor(119, 114, 126);
  const pad = size * 0.22;
  const colW = size * 0.16;
  const barH = size * 0.14;

  // Left pillar
  doc.rect(x + pad, y + pad, colW, size - pad * 2, 'F');
  // Right pillar
  doc.rect(x + size - pad - colW, y + pad, colW, size - pad * 2, 'F');
  // Crossbar
  doc.rect(x + pad, y + (size - barH) / 2, size - pad * 2, barH, 'F');
}

/**
 * Robust cross-browser PDF download helper
 */
export function downloadPDFDocument(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 200);
  } catch (e) {
    doc.save(filename);
  }
}

export function generateInvoicePDF(invoice: Invoice, org: Organization, template: TemplateType = 'titanium'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isTaxEnabled = org.is_tax_enabled !== false;
  const accentColor = [119, 114, 126]; // #77727E
  const darkSlate = [18, 18, 22];

  // Universal Luxury Header Bar with Vector HESICS Logo
  doc.setFillColor(18, 18, 22);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 37, 210, 1.2, 'F');

  // Vector Logo Emblem
  drawHesicsLogo(doc, 16, 12, 14, true);

  // Brand Name & Tagline
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(org.name || 'HESICS', 34, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 180);
  doc.text(org.tagline || 'ENTERPRISE BUSINESS OPERATING SYSTEM', 34, 26);

  // Document Title & Number
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(244, 244, 246);
  doc.text('TAX INVOICE', 194, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 180);
  doc.text(`# ${invoice.invoice_number}`, 194, 27, { align: 'right' });

  // Meta Section: Billed From & Billed To
  const metaStartY = 48;
  doc.setTextColor(100, 100, 110);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED FROM:', 16, metaStartY);
  doc.text('BILLED TO CLIENT:', 110, metaStartY);

  doc.setTextColor(30, 30, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(org.name || 'HESICS Organization', 16, metaStartY + 6);
  doc.text(invoice.client_name || 'Client Account', 110, metaStartY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 80);

  let fromY = metaStartY + 11;
  if (org.email) { doc.text(`Email: ${org.email}`, 16, fromY); fromY += 4.5; }
  if (org.address) { doc.text(org.address, 16, fromY); fromY += 4.5; }
  if (isTaxEnabled && org.gstin) { doc.text(`GSTIN: ${org.gstin}`, 16, fromY); }

  let toY = metaStartY + 11;
  if (invoice.client_email) { doc.text(`Email: ${invoice.client_email}`, 110, toY); toY += 4.5; }
  doc.text(`Issue Date: ${invoice.issue_date || new Date().toISOString().split('T')[0]}`, 110, toY); toY += 4.5;
  doc.text(`Payment Due: ${invoice.due_date}`, 110, toY); toY += 4.5;
  doc.text(`Status: ${(invoice.status || 'SENT').toUpperCase()}`, 110, toY);

  // Line items table
  const items = invoice.line_items || invoice.items || [];
  const tableData = items.map((item, index) => [
    index + 1,
    item.description || 'Professional Commercial Deliverable',
    item.quantity || 1,
    `INR ${(Number(item.unit_price ?? item.rate) || 0).toLocaleString('en-IN')}`,
    `INR ${(Number(item.amount) || 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: Math.max(fromY, toY) + 8,
    head: [['#', 'Scope / Deliverable Description', 'Qty', 'Unit Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [18, 18, 22],
      textColor: [244, 244, 246],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      textColor: [40, 40, 48],
      cellPadding: 3.5,
      lineColor: [220, 220, 226],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary / Totals Breakdown Box
  const summaryX = 120;
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 226);
  doc.roundedRect(summaryX, finalY, 74, isTaxEnabled ? 32 : 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('Subtotal:', summaryX + 6, finalY + 7);
  doc.text(`INR ${(Number(invoice.subtotal) || 0).toLocaleString('en-IN')}`, summaryX + 68, finalY + 7, { align: 'right' });

  let totalOffset = 7;
  if (isTaxEnabled) {
    doc.text('GST (18%):', summaryX + 6, finalY + 14);
    doc.text(`INR ${(Number(invoice.tax) || 0).toLocaleString('en-IN')}`, summaryX + 68, finalY + 14, { align: 'right' });
    totalOffset = 21;
  } else {
    totalOffset = 14;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Total Payable:', summaryX + 6, finalY + totalOffset);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`INR ${(Number(invoice.total) || 0).toLocaleString('en-IN')}`, summaryX + 68, finalY + totalOffset, { align: 'right' });

  // Notes and Commercial Terms
  const termsY = finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.text('PAYMENT TERMS & GOVERNANCE:', 16, termsY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 120);
  doc.text('1. Payment is requested within specified due date via RTGS / NEFT / Wire Transfer.', 16, termsY + 12);
  doc.text('2. Please reference this formal invoice number on commercial remittals.', 16, termsY + 17);
  doc.text('3. Authorized electronic document generated by HESICS Business OS.', 16, termsY + 22);

  // Footer seal
  doc.setDrawColor(220, 220, 226);
  doc.line(16, 280, 194, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 150);
  doc.text('HESICS Enterprise Suite • Confidential & Privileged Commercial Document', 105, 285, { align: 'center' });

  return doc;
}

export function generateQuotationPDF(quote: Quotation, org: Organization, template: TemplateType = 'titanium'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isTaxEnabled = org.is_tax_enabled !== false;
  const accentColor = [119, 114, 126];
  const darkSlate = [18, 18, 22];

  // Universal Luxury Header Bar with Vector HESICS Logo
  doc.setFillColor(18, 18, 22);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 37, 210, 1.2, 'F');

  // Vector Logo Emblem
  drawHesicsLogo(doc, 16, 12, 14, true);

  // Brand Name & Tagline
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(org.name || 'HESICS', 34, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 180);
  doc.text(org.tagline || 'COMMERCIAL SCOPE & PROPOSAL', 34, 26);

  // Title & Number
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(244, 244, 246);
  doc.text('QUOTATION', 194, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 180);
  doc.text(`# ${quote.quotation_number || quote.quote_number || 'QT-001'}`, 194, 27, { align: 'right' });

  const metaStartY = 48;
  doc.setTextColor(100, 100, 110);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED BY:', 16, metaStartY);
  doc.text('PREPARED FOR CLIENT:', 110, metaStartY);

  doc.setTextColor(30, 30, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(org.name || 'HESICS Organization', 16, metaStartY + 6);
  doc.text(quote.client_name || 'Client Account', 110, metaStartY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 80);

  let fromY = metaStartY + 11;
  if (org.email) { doc.text(`Email: ${org.email}`, 16, fromY); fromY += 4.5; }
  if (org.address) { doc.text(org.address, 16, fromY); fromY += 4.5; }
  if (isTaxEnabled && org.gstin) { doc.text(`GSTIN: ${org.gstin}`, 16, fromY); }

  let toY = metaStartY + 11;
  if (quote.client_email) { doc.text(`Email: ${quote.client_email}`, 110, toY); toY += 4.5; }
  doc.text(`Issue Date: ${quote.issue_date || new Date().toISOString().split('T')[0]}`, 110, toY); toY += 4.5;
  doc.text(`Valid Until: ${quote.valid_until || quote.expiry_date || '30 Days'}`, 110, toY); toY += 4.5;
  doc.text(`Status: ${(quote.status || 'SENT').toUpperCase()}`, 110, toY);

  const items = quote.line_items || quote.items || [];
  const tableData = items.map((item, index) => [
    index + 1,
    item.description || 'Milestone Deliverable / Scope',
    item.quantity || 1,
    `INR ${(Number(item.unit_price ?? item.rate) || 0).toLocaleString('en-IN')}`,
    `INR ${(Number(item.amount) || 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: Math.max(fromY, toY) + 8,
    head: [['#', 'Scope / Deliverable Description', 'Qty', 'Unit Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [18, 18, 22],
      textColor: [244, 244, 246],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      textColor: [40, 40, 48],
      cellPadding: 3.5,
      lineColor: [220, 220, 226],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  const summaryX = 120;
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 226);
  doc.roundedRect(summaryX, finalY, 74, isTaxEnabled ? 32 : 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('Estimated Subtotal:', summaryX + 6, finalY + 7);
  doc.text(`INR ${(Number(quote.subtotal) || 0).toLocaleString('en-IN')}`, summaryX + 68, finalY + 7, { align: 'right' });

  let totalOffset = 7;
  if (isTaxEnabled) {
    doc.text('Estimated GST (18%):', summaryX + 6, finalY + 14);
    doc.text(`INR ${(Number(quote.tax) || 0).toLocaleString('en-IN')}`, summaryX + 68, finalY + 14, { align: 'right' });
    totalOffset = 21;
  } else {
    totalOffset = 14;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Total Quotation:', summaryX + 6, finalY + totalOffset);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`INR ${(Number(quote.total) || 0).toLocaleString('en-IN')}`, summaryX + 68, finalY + totalOffset, { align: 'right' });

  const termsY = finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.text('ESTIMATE TERMS & VALIDITY:', 16, termsY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 120);
  doc.text(`1. This commercial estimate remains valid until ${quote.valid_until || quote.expiry_date || '30 days from issuance'}.`, 16, termsY + 12);
  doc.text('2. Deliverables initiate upon formal sign-off and milestone commercial advance.', 16, termsY + 17);
  doc.text('3. Authorized electronic scope quotation generated by HESICS Business OS.', 16, termsY + 22);

  doc.setDrawColor(220, 220, 226);
  doc.line(16, 280, 194, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 150);
  doc.text('HESICS Enterprise Suite • Confidential Commercial Quotation', 105, 285, { align: 'center' });

  return doc;
}
