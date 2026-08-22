import * as XLSX from 'xlsx';
import { Invoice, Quotation, Deal, IncomeEntry, ExpenseEntry } from './types';
import { AuditLogEntry, formatAuditAction } from './auditLog';

function saveExcelBlob(workbook: XLSX.WorkBook, filename: string) {
  try {
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.error('Direct blob export error, falling back to XLSX.writeFile:', err);
    XLSX.writeFile(workbook, filename);
  }
}

export function exportInvoicesToExcel(invoices: Invoice[], filename = 'HESICS_Invoices_Register.xlsx') {
  const data = invoices.map((inv, idx) => ({
    'S.No': idx + 1,
    'Invoice Number': inv.invoice_number,
    'Client Name': inv.client_name,
    'Client Email': inv.client_email || 'N/A',
    'Issue Date': inv.issue_date || 'N/A',
    'Due Date': inv.due_date,
    'Status': (inv.status || 'draft').toUpperCase(),
    'Subtotal (INR)': inv.subtotal,
    'GST Tax (INR)': inv.tax || 0,
    'Total Payable (INR)': inv.total,
    'Paid At': inv.paid_at || 'Unpaid',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
  saveExcelBlob(workbook, filename);
}

export function exportQuotationsToExcel(quotations: Quotation[], filename = 'HESICS_Quotations_Register.xlsx') {
  const data = quotations.map((q, idx) => ({
    'S.No': idx + 1,
    'Quotation Number': q.quotation_number || q.quote_number,
    'Client Name': q.client_name,
    'Client Email': q.client_email || 'N/A',
    'Issue Date': q.issue_date || 'N/A',
    'Valid Until': q.valid_until || q.expiry_date || 'N/A',
    'Status': (q.status || 'draft').toUpperCase(),
    'Subtotal (INR)': q.subtotal,
    'Estimated GST (INR)': q.tax || 0,
    'Total Estimate (INR)': q.total,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');
  saveExcelBlob(workbook, filename);
}

export function exportFinanceToExcel(
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[],
  filename = 'HESICS_Financial_Ledger.xlsx'
) {
  const incomeData = incomes.map((inc, idx) => ({
    'S.No': idx + 1,
    'Client / Source': inc.client_name || inc.source_type,
    'Category': inc.category,
    'Amount (INR)': inc.amount,
    'Payment Method': inc.payment_method || 'Bank Transfer',
    'Received Date': inc.received_at,
    'Notes': inc.notes || '',
  }));

  const expenseData = expenses.map((exp, idx) => ({
    'S.No': idx + 1,
    'Vendor / Service': exp.vendor || 'General Operational',
    'Category': exp.category,
    'Amount (INR)': exp.amount,
    'GST Paid (INR)': exp.gst_paid || 0,
    'Expense Date': exp.spent_at || exp.date || '',
    'Notes': exp.notes || '',
  }));

  const workbook = XLSX.utils.book_new();
  const incSheet = XLSX.utils.json_to_sheet(incomeData);
  const expSheet = XLSX.utils.json_to_sheet(expenseData);

  XLSX.utils.book_append_sheet(workbook, incSheet, 'Revenue Inflows');
  XLSX.utils.book_append_sheet(workbook, expSheet, 'Expenditures');
  saveExcelBlob(workbook, filename);
}

export function exportAuditLogsToExcel(logs: AuditLogEntry[], filename = 'HESICS_Audit_Logs.xlsx') {
  const data = logs.map((log, idx) => ({
    'S.No': idx + 1,
    'Timestamp': new Date(log.timestamp).toLocaleString(),
    'Actor Email': log.actor_email,
    'Actor Role': log.actor_role,
    'Action': formatAuditAction(log.action),
    'Action Code': log.action,
    'Target Entity': log.entity_label || log.entity_id,
    'Details / Payload': log.details ? JSON.stringify(log.details) : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
  saveExcelBlob(workbook, filename);
}

export function exportMonthlyIncomeToExcel(incomes: IncomeEntry[], filename = 'HESICS_Income_Report.xlsx') {
  const data = incomes.map((inc, idx) => ({
    'S.No': idx + 1,
    'Client / Source': inc.client_name || inc.source_type || 'General Revenue',
    'Category': inc.category || 'Revenue',
    'Amount (INR)': inc.amount,
    'Payment Method': inc.payment_method || 'Bank Transfer',
    'Received Date': inc.received_at || '-',
    'Notes': inc.notes || '',
  }));
  const total = incomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  data.push({ 'S.No': '' as any, 'Client / Source': 'TOTAL', 'Category': '', 'Amount (INR)': total as any, 'Payment Method': '', 'Received Date': '', 'Notes': '' });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Income');
  saveExcelBlob(workbook, filename);
}

export function exportMonthlyExpenseToExcel(expenses: ExpenseEntry[], filename = 'HESICS_Expense_Report.xlsx') {
  const data = expenses.map((exp, idx) => ({
    'S.No': idx + 1,
    'Vendor / Description': exp.vendor || 'Operational Expense',
    'Category': exp.category || 'Operations',
    'Amount (INR)': exp.amount,
    'GST Paid (INR)': exp.gst_paid || 0,
    'Date': exp.spent_at || exp.date || '-',
    'Notes': exp.notes || '',
  }));
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  data.push({ 'S.No': '' as any, 'Vendor / Description': 'TOTAL', 'Category': '', 'Amount (INR)': total as any, 'GST Paid (INR)': '' as any, 'Date': '', 'Notes': '' });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
  saveExcelBlob(workbook, filename);
}
