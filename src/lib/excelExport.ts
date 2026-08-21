import * as XLSX from 'xlsx';
import { Invoice, Quotation, Deal, IncomeEntry, ExpenseEntry } from './types';

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
  XLSX.writeFile(workbook, filename);
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
  XLSX.writeFile(workbook, filename);
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
  XLSX.writeFile(workbook, filename);
}
