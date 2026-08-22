import { db } from './index';
import { Invoice, Quotation } from '../types';

export const getInvoices = (): Invoice[] => db.getInvoices();
export const addInvoice = (data: Omit<Invoice, 'id' | 'org_id' | 'created_at'>): Invoice => db.addInvoice(data);
export const updateInvoice = (id: string, data: Partial<Invoice>): Invoice | undefined => db.updateInvoice(id, data);
export const deleteInvoice = (id: string): void => db.deleteInvoice(id);

export const getQuotations = (): Quotation[] => db.getQuotations();
export const addQuotation = (data: Omit<Quotation, 'id' | 'org_id' | 'created_at'>): Quotation => db.addQuotation(data);
export const updateQuotation = (id: string, data: Partial<Quotation>): Quotation | undefined => db.updateQuotation(id, data);
export const deleteQuotation = (id: string): void => db.deleteQuotation(id);
export { db };
