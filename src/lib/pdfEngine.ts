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
  { id: 'titanium',   name: 'Titanium Luxury',      description: 'Deep slate with #77727E metallic accents & clean grid', badge: 'Titanium' },
  { id: 'executive',  name: 'Executive Minimalist', description: 'Ultra-clean high-ticket monochrome with accent bar',     badge: 'Executive' },
  { id: 'corporate',  name: 'Corporate Enterprise', description: 'Formal navy-charcoal structure with itemized lines',   badge: 'Enterprise' },
  { id: 'commercial', name: 'Classic Commercial',    description: 'Clean bordered compliance box with dual-tone header',  badge: 'Commercial' },
];

let logoCacheWhite: string | null = null;
let logoCacheDark: string | null = null;

async function fetchLogoBase64(variant: 'white' | 'dark'): Promise<string | null> {
  const cache = variant === 'white' ? logoCacheWhite : logoCacheDark;
  if (cache) return cache;
  try {
    const resp = await fetch(`/assets/hesics-logo-${variant}.png`);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        if (variant === 'white') logoCacheWhite = b64;
        else logoCacheDark = b64;
        resolve(b64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addHesicsLogo(doc: jsPDF, b64: string | null, x: number, y: number, w: number) {
  if (b64) {
    try {
      doc.addImage(b64, 'PNG', x, y, w, w);
      return;
    } catch {}
  }
  doc.setFillColor(119, 114, 126);
  doc.roundedRect(x, y, w, w, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(w * 0.5);
  doc.text('H', x + w / 2, y + w * 0.68, { align: 'center' });
}

export function downloadPDFDocument(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  } catch {
    try { doc.save(filename); } catch (e) { console.error('PDF save failed:', e); }
  }
}

export function getPDFBlobUrl(doc: jsPDF): string {
  try {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: TITANIUM LUXURY (Deep Charcoal & Titanium Accent #77727E)
// ─────────────────────────────────────────────────────────────────────────────
function renderTitaniumPDF(doc: jsPDF, type: 'TAX INVOICE' | 'QUOTATION', docNumber: string, org: Organization, client: { name: string; email?: string; address?: string; gstin?: string }, meta: { issueDate: string; dueDateOrValid: string; status: string }, items: any[], subtotal: number, tax: number, total: number, isTax: boolean, logoB64: string | null) {
  // Header bar
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(119, 114, 126);
  doc.rect(0, 35.5, 210, 0.8, 'F');

  addHesicsLogo(doc, logoB64, 14, 10, 16);

  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(org.name || 'HESICS', 34, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 170);
  doc.text('MAKE IT SIMPLE', 34, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(244, 244, 246);
  doc.text(type, 194, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(160, 160, 170);
  doc.text(`# ${docNumber}`, 194, 26, { align: 'right' });

  // Meta Section
  const startY = 46;
  doc.setTextColor(110, 110, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED BY:', 16, startY);
  doc.text(type === 'TAX INVOICE' ? 'BILLED TO:' : 'PREPARED FOR:', 110, startY);

  let yL = startY + 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(30, 30, 35);
  doc.text(org.name || 'HESICS', 16, yL); yL += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 90);
  if (org.email) { doc.text(`Email: ${org.email}`, 16, yL); yL += 4.5; }
  if (org.address) { doc.text(org.address, 16, yL); yL += 4.5; }
  if (isTax && org.gstin) { doc.text(`GSTIN: ${org.gstin}`, 16, yL); yL += 4.5; }

  let yR = startY + 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(30, 30, 35);
  doc.text(client.name || 'Client', 110, yR); yR += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 90);
  if (client.email) { doc.text(`Email: ${client.email}`, 110, yR); yR += 4.5; }
  doc.text(`Issue Date: ${meta.issueDate}`, 110, yR); yR += 4.5;
  doc.text(`${type === 'TAX INVOICE' ? 'Due Date' : 'Valid Until'}: ${meta.dueDateOrValid}`, 110, yR); yR += 4.5;
  doc.text(`Status: ${meta.status.toUpperCase()}`, 110, yR); yR += 4.5;

  const tableStartY = Math.max(yL, yR) + 6;

  // Table
  const rows = items.map((item, i) => [
    i + 1,
    item.description || 'Professional Engagement Deliverable',
    item.quantity || 1,
    `INR ${Number(item.unit_price ?? item.rate ?? 0).toLocaleString('en-IN')}`,
    `INR ${Number(item.amount ?? 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Scope / Description', 'Qty', 'Unit Rate', 'Amount']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 15, 20], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3.5, lineColor: [218, 218, 224], textColor: [40, 40, 48] },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' } },
  });

  const afterY = (doc as any).lastAutoTable.finalY;

  // Totals Box
  const x = 118, h = isTax ? 30 : 22;
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(218, 218, 224);
  doc.roundedRect(x, afterY + 6, 76, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 90);
  doc.text('Subtotal:', x + 5, afterY + 14);
  doc.text(`INR ${subtotal.toLocaleString('en-IN')}`, x + 71, afterY + 14, { align: 'right' });
  let ty = afterY + 14;
  if (isTax) {
    ty += 7;
    doc.text('GST (18%):', x + 5, ty);
    doc.text(`INR ${tax.toLocaleString('en-IN')}`, x + 71, ty, { align: 'right' });
  }
  ty += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(15, 15, 20);
  doc.text('Total Amount:', x + 5, ty);
  doc.setTextColor(119, 114, 126);
  doc.text(`INR ${total.toLocaleString('en-IN')}`, x + 71, ty, { align: 'right' });

  // Terms
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 110);
  doc.text('COMMERCIAL TERMS:', 16, afterY + 14);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 120);
  ['1. Remit via NEFT / RTGS / Direct Bank Transfer.', '2. Reference document number on all remittance receipts.', '3. Generated by HESICS Business Operating System.'].forEach((t, i) => doc.text(t, 16, afterY + 20 + i * 4.5));

  // Footer
  doc.setDrawColor(218, 218, 224);
  doc.line(14, 280, 196, 280);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 140, 150);
  doc.text('HESICS Titanium Edition  •  Make It Simple  •  hesics1@gmail.com  •  hub-hesics.vercel.app', 105, 284, { align: 'center' });
  doc.text('Confidential & Privileged Commercial Document', 105, 289, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: EXECUTIVE MINIMALIST (Ultra-clean, pure white, bold lines)
// ─────────────────────────────────────────────────────────────────────────────
function renderExecutivePDF(doc: jsPDF, type: 'TAX INVOICE' | 'QUOTATION', docNumber: string, org: Organization, client: { name: string; email?: string; address?: string; gstin?: string }, meta: { issueDate: string; dueDateOrValid: string; status: string }, items: any[], subtotal: number, tax: number, total: number, isTax: boolean, logoB64: string | null) {
  // Minimalist top header line
  doc.setFillColor(30, 30, 36);
  doc.rect(14, 14, 182, 1.5, 'F');

  // Title and Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 24);
  doc.text(org.name || 'HESICS', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text('EXECUTIVE OPERATIONS', 14, 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 24);
  doc.text(type, 196, 25, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 110);
  doc.text(`Ref: ${docNumber}`, 196, 31, { align: 'right' });

  // Divider
  doc.setDrawColor(230, 230, 235);
  doc.line(14, 36, 196, 36);

  // Meta Section
  const startY = 44;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 140);
  doc.text('CLIENT DETAILS', 14, startY);
  doc.text('SCHEDULE & STATUS', 120, startY);

  let yL = startY + 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 24);
  doc.text(client.name || 'Client', 14, yL); yL += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 100);
  if (client.email) { doc.text(`Email: ${client.email}`, 14, yL); yL += 4.5; }
  if (org.address) { doc.text(`Location: ${org.address}`, 14, yL); yL += 4.5; }

  let yR = startY + 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 100);
  doc.text(`Date Issued: ${meta.issueDate}`, 120, yR); yR += 4.5;
  doc.text(`${type === 'TAX INVOICE' ? 'Payment Due' : 'Valid Until'}: ${meta.dueDateOrValid}`, 120, yR); yR += 4.5;
  doc.text(`Status: ${meta.status.toUpperCase()}`, 120, yR); yR += 4.5;

  const tableStartY = Math.max(yL, yR) + 6;

  // Clean Minimalist Table (No vertical lines)
  const rows = items.map((item, i) => [
    i + 1,
    item.description || 'Deliverable',
    item.quantity || 1,
    `₹${Number(item.unit_price ?? item.rate ?? 0).toLocaleString('en-IN')}`,
    `₹${Number(item.amount ?? 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: [245, 245, 248], textColor: [20, 20, 24], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4, lineColor: [235, 235, 240], textColor: [40, 40, 48] },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' } },
  });

  const afterY = (doc as any).lastAutoTable.finalY;

  // Minimal Totals
  const x = 130;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 110);
  doc.text('Subtotal', x, afterY + 10);
  doc.text(`₹${subtotal.toLocaleString('en-IN')}`, 196, afterY + 10, { align: 'right' });
  let ty = afterY + 10;
  if (isTax) {
    ty += 6;
    doc.text('GST (18%)', x, ty);
    doc.text(`₹${tax.toLocaleString('en-IN')}`, 196, ty, { align: 'right' });
  }
  ty += 6;
  doc.setDrawColor(20, 20, 24);
  doc.line(x, ty - 2, 196, ty - 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 24);
  doc.text('Total Due', x, ty + 3);
  doc.text(`₹${total.toLocaleString('en-IN')}`, 196, ty + 3, { align: 'right' });

  // Minimal Footer
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 150, 160);
  doc.text('HESICS Executive Suite  •  hesics1@gmail.com  •  hub-hesics.vercel.app', 105, 286, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: CORPORATE ENTERPRISE (Formal Blue-Slate Header, Boxed Structure)
// ─────────────────────────────────────────────────────────────────────────────
function renderCorporatePDF(doc: jsPDF, type: 'TAX INVOICE' | 'QUOTATION', docNumber: string, org: Organization, client: { name: string; email?: string; address?: string; gstin?: string }, meta: { issueDate: string; dueDateOrValid: string; status: string }, items: any[], subtotal: number, tax: number, total: number, isTax: boolean, logoB64: string | null) {
  // Corporate Dual-Tone Header
  doc.setFillColor(24, 32, 48); // Deep Navy Slate
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(org.name || 'HESICS ENTERPRISE', 16, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 195, 220);
  doc.text('CORPORATE ADVISORY & SOLUTIONS', 16, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(type, 194, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 195, 220);
  doc.text(`Doc #: ${docNumber}`, 194, 25, { align: 'right' });

  // Corporate Bordered Meta Box
  const startY = 40;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(210, 220, 235);
  doc.roundedRect(14, startY, 182, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(30, 45, 70);
  doc.text('ORIGINATING ENTITY:', 18, startY + 7);
  doc.text('RECIPIENT ENTITY:', 108, startY + 7);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 85, 110);
  doc.text(`${org.name || 'HESICS'} • ${org.email || 'hesics1@gmail.com'}`, 18, startY + 14);
  if (isTax && org.gstin) doc.text(`GSTIN: ${org.gstin}`, 18, startY + 20);

  doc.text(`${client.name || 'Client'} • ${client.email || '—'}`, 108, startY + 14);
  doc.text(`Issued: ${meta.issueDate}  |  Terms: ${meta.dueDateOrValid}`, 108, startY + 20);

  const tableStartY = startY + 34;

  // Structured Corporate Table
  const rows = items.map((item, i) => [
    i + 1,
    item.description || 'Deliverable',
    item.quantity || 1,
    `INR ${Number(item.unit_price ?? item.rate ?? 0).toLocaleString('en-IN')}`,
    `INR ${Number(item.amount ?? 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Line', 'Deliverable Specification', 'Units', 'Unit Price', 'Total (INR)']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [24, 32, 48], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3.5, lineColor: [210, 220, 235] },
    columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' } },
  });

  const afterY = (doc as any).lastAutoTable.finalY;

  // Corporate Summary Box
  const x = 118;
  doc.setFillColor(24, 32, 48);
  doc.roundedRect(x, afterY + 6, 78, isTax ? 32 : 24, 2, 2, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(200, 215, 235);
  doc.text('Subtotal (Excl. Tax):', x + 5, afterY + 14);
  doc.text(`INR ${subtotal.toLocaleString('en-IN')}`, x + 73, afterY + 14, { align: 'right' });
  let ty = afterY + 14;
  if (isTax) {
    ty += 7;
    doc.text('GST (18%):', x + 5, ty);
    doc.text(`INR ${tax.toLocaleString('en-IN')}`, x + 73, ty, { align: 'right' });
  }
  ty += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE:', x + 5, ty);
  doc.text(`INR ${total.toLocaleString('en-IN')}`, x + 73, ty, { align: 'right' });

  // Corporate Footer
  doc.setDrawColor(210, 220, 235);
  doc.line(14, 280, 196, 280);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 135, 155);
  doc.text('HESICS Corporate Enterprise Division  •  Official Accounting Record  •  hub-hesics.vercel.app', 105, 285, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: CLASSIC COMMERCIAL (Traditional Light, Clean Dark Border, Verified Seal)
// ─────────────────────────────────────────────────────────────────────────────
function renderCommercialPDF(doc: jsPDF, type: 'TAX INVOICE' | 'QUOTATION', docNumber: string, org: Organization, client: { name: string; email?: string; address?: string; gstin?: string }, meta: { issueDate: string; dueDateOrValid: string; status: string }, items: any[], subtotal: number, tax: number, total: number, isTax: boolean, logoB64: string | null) {
  // Classic Border around full page
  doc.setDrawColor(60, 60, 70);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, 190, 277);

  // Top header inside border
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 15, 20);
  doc.text(org.name || 'HESICS', 16, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 100);
  doc.text('COMMERCIAL OPERATIONS & CONTRACTING', 16, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 15, 20);
  doc.text(type, 194, 24, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(119, 114, 126);
  doc.text(`REF: ${docNumber}`, 194, 30, { align: 'right' });

  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.4);
  doc.line(10, 36, 200, 36);

  // Commercial 2-Column Split
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 60, 70);
  doc.text('ISSUED TO:', 16, 44);
  doc.text('COMMERCIAL TERMS:', 110, 44);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 24);
  doc.text(client.name || 'Client', 16, 50);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 100);
  if (client.email) doc.text(client.email, 16, 55);

  doc.text(`Issue Date: ${meta.issueDate}`, 110, 50);
  doc.text(`Payment / Validity: ${meta.dueDateOrValid}`, 110, 55);
  doc.text(`Status: ${meta.status.toUpperCase()}`, 110, 60);

  doc.line(10, 66, 200, 66);

  // Table
  const rows = items.map((item, i) => [
    i + 1,
    item.description || 'Deliverable',
    item.quantity || 1,
    `INR ${Number(item.unit_price ?? item.rate ?? 0).toLocaleString('en-IN')}`,
    `INR ${Number(item.amount ?? 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: 70,
    margin: { left: 14, right: 14 },
    head: [['Item', 'Scope Description', 'Qty', 'Rate (INR)', 'Amount (INR)']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 244], textColor: [20, 20, 24], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [200, 200, 210] },
    columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' } },
  });

  const afterY = (doc as any).lastAutoTable.finalY;

  // Classic Totals
  const x = 120;
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(x, afterY + 6, 76, isTax ? 28 : 20, 1, 1, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 90);
  doc.text('Subtotal:', x + 5, afterY + 13);
  doc.text(`INR ${subtotal.toLocaleString('en-IN')}`, x + 71, afterY + 13, { align: 'right' });
  let ty = afterY + 13;
  if (isTax) {
    ty += 6;
    doc.text('GST (18%):', x + 5, ty);
    doc.text(`INR ${tax.toLocaleString('en-IN')}`, x + 71, ty, { align: 'right' });
  }
  ty += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 20, 24);
  doc.text('GRAND TOTAL:', x + 5, ty);
  doc.text(`INR ${total.toLocaleString('en-IN')}`, x + 71, ty, { align: 'right' });

  // Bottom Legal Text
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 130);
  doc.text('Legally binding commercial instrument governed under Indian IT Act 2000.', 105, 278, { align: 'center' });
  doc.text('HESICS Commercial Division  •  Make It Simple', 105, 283, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCHERS: Router for 4 Unique Templates
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoice: Invoice, org: Organization, template: TemplateType = 'titanium'): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isTax = org.is_tax_enabled !== false;
  const logoB64 = await fetchLogoBase64('white');

  const selectedTemplate = (template || (invoice as any).template_id || org.default_invoice_template || 'titanium') as TemplateType;

  const clientInfo = {
    name: invoice.client_name || 'Client',
    email: invoice.client_email,
    address: org.address,
    gstin: org.gstin,
  };

  const meta = {
    issueDate: invoice.issue_date || new Date().toISOString().split('T')[0],
    dueDateOrValid: invoice.due_date || 'On Receipt',
    status: invoice.status || 'SENT',
  };

  const items = invoice.line_items || invoice.items || [];
  const subtotal = Number(invoice.subtotal) || 0;
  const tax = Number(invoice.tax) || 0;
  const total = Number(invoice.total) || 0;

  if (selectedTemplate === 'executive') {
    renderExecutivePDF(doc, 'TAX INVOICE', invoice.invoice_number, org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  } else if (selectedTemplate === 'corporate') {
    renderCorporatePDF(doc, 'TAX INVOICE', invoice.invoice_number, org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  } else if (selectedTemplate === 'commercial') {
    renderCommercialPDF(doc, 'TAX INVOICE', invoice.invoice_number, org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  } else {
    renderTitaniumPDF(doc, 'TAX INVOICE', invoice.invoice_number, org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  }

  return doc;
}

export async function generateQuotationPDF(quote: Quotation, org: Organization, template: TemplateType = 'titanium'): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isTax = org.is_tax_enabled !== false;
  const logoB64 = await fetchLogoBase64('white');

  const selectedTemplate = (template || (quote as any).template_id || org.default_quotation_template || 'titanium') as TemplateType;

  const clientInfo = {
    name: quote.client_name || 'Client',
    email: quote.client_email,
    address: org.address,
    gstin: org.gstin,
  };

  const meta = {
    issueDate: quote.issue_date || new Date().toISOString().split('T')[0],
    dueDateOrValid: quote.valid_until || (quote as any).expiry_date || '30 Days',
    status: quote.status || 'DRAFT',
  };

  const items = quote.line_items || (quote as any).items || [];
  const subtotal = Number(quote.subtotal) || 0;
  const tax = Number(quote.tax) || 0;
  const total = Number(quote.total) || 0;

  if (selectedTemplate === 'executive') {
    renderExecutivePDF(doc, 'QUOTATION', quote.quotation_number || (quote as any).quote_number || 'QT-001', org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  } else if (selectedTemplate === 'corporate') {
    renderCorporatePDF(doc, 'QUOTATION', quote.quotation_number || (quote as any).quote_number || 'QT-001', org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  } else if (selectedTemplate === 'commercial') {
    renderCommercialPDF(doc, 'QUOTATION', quote.quotation_number || (quote as any).quote_number || 'QT-001', org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  } else {
    renderTitaniumPDF(doc, 'QUOTATION', quote.quotation_number || (quote as any).quote_number || 'QT-001', org, clientInfo, meta, items, subtotal, tax, total, isTax, logoB64);
  }

  return doc;
}

export async function generateIncomeReportPDF(entries: any[], org: Organization, month: string): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoB64 = await fetchLogoBase64('white');
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, 210, 36, 'F');
  addHesicsLogo(doc, logoB64, 14, 10, 16);
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('INCOME REPORT', 34, 19);
  doc.setFontSize(8.5);
  doc.text(month, 194, 19, { align: 'right' });

  const total = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  autoTable(doc, {
    startY: 50,
    head: [['#', 'Client / Source', 'Category', 'Method', 'Date', 'Amount (INR)']],
    body: entries.map((e, i) => [i + 1, e.client_name || e.source_type || '-', e.category || '-', e.payment_method || '-', e.received_at || '-', Number(e.amount || 0).toLocaleString('en-IN')]),
    theme: 'grid',
    headStyles: { fillColor: [15, 15, 20], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [218, 218, 224] },
    columnStyles: { 5: { halign: 'right' } },
  });
  return doc;
}

export async function generateExpenseReportPDF(entries: any[], org: Organization, month: string): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoB64 = await fetchLogoBase64('white');
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, 210, 36, 'F');
  addHesicsLogo(doc, logoB64, 14, 10, 16);
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('EXPENSE REPORT', 34, 19);
  doc.setFontSize(8.5);
  doc.text(month, 194, 19, { align: 'right' });

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Vendor / Description', 'Category', 'GST Paid', 'Date', 'Amount (INR)']],
    body: entries.map((e, i) => [i + 1, e.vendor || e.category || '-', e.category || '-', e.gst_paid ? `INR ${Number(e.gst_paid).toLocaleString('en-IN')}` : '-', e.spent_at || e.date || '-', Number(e.amount || 0).toLocaleString('en-IN')]),
    theme: 'grid',
    headStyles: { fillColor: [15, 15, 20], textColor: [244, 244, 246], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [218, 218, 224] },
    columnStyles: { 5: { halign: 'right' } },
  });
  return doc;
}

export async function generateFinanceReportPDF(incomes: any[], expenses: any[], periodLabel: string, org: Organization): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoB64 = await fetchLogoBase64('white');
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, 210, 36, 'F');
  addHesicsLogo(doc, logoB64, 14, 10, 16);
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FINANCIAL STATEMENT', 34, 19);
  doc.setFontSize(8.5);
  doc.text(periodLabel, 194, 19, { align: 'right' });

  const totalInc = incomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const net = totalInc - totalExp;

  doc.setFillColor(245, 245, 248);
  doc.roundedRect(14, 44, 182, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 110);
  doc.text('TOTAL REVENUE', 20, 51);
  doc.text('TOTAL EXPENSES', 80, 51);
  doc.text('NET PROFIT', 140, 51);

  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text(`INR ${totalInc.toLocaleString('en-IN')}`, 20, 58);
  doc.text(`INR ${totalExp.toLocaleString('en-IN')}`, 80, 58);
  doc.setTextColor(net >= 0 ? 34 : 220, net >= 0 ? 160 : 50, net >= 0 ? 90 : 50);
  doc.text(`INR ${net.toLocaleString('en-IN')}`, 140, 58);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Revenue Source', 'Category', 'Date', 'Amount (INR)']],
    body: incomes.slice(0, 12).map((e, i) => [i + 1, e.client_name || e.source_type || 'Direct', e.category || 'Service', e.received_at || e.created_at?.split('T')[0] || '-', Number(e.amount || 0).toLocaleString('en-IN')]),
    theme: 'grid',
    headStyles: { fillColor: [15, 15, 20], textColor: [244, 244, 246], fontSize: 7.5, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [218, 218, 224] },
    columnStyles: { 4: { halign: 'right' } },
  });

  return doc;
}

export async function generateAgreementPDF(agreement: {
  clientName: string; clientEmail: string; clientPhone: string;
  clientCompany?: string; panCard?: string; aadhaarNumber?: string;
  scope: string[]; signatureDataUrl?: string; photoDataUrl?: string;
  agreementId: string; signedAt: string; org: Organization;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoWhite = await fetchLogoBase64('white');
  const num = `AGR-${agreement.agreementId.slice(-6).toUpperCase()}`;

  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, 210, 36, 'F');
  addHesicsLogo(doc, logoWhite, 14, 10, 16);
  doc.setTextColor(244, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SERVICE AGREEMENT', 34, 19);
  doc.setFontSize(8.5);
  doc.text(num, 194, 19, { align: 'right' });

  return doc;
}
