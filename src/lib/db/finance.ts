import { db } from './index';
import { IncomeEntry, ExpenseEntry } from '../types';

export const getIncomeEntries = (): IncomeEntry[] => db.getIncomeEntries();
export const addIncomeEntry = (data: Omit<IncomeEntry, 'id' | 'org_id' | 'created_at'>): IncomeEntry => db.addIncomeEntry(data);
export const deleteIncomeEntry = (id: string): void => db.deleteIncomeEntry(id);

export const getExpenseEntries = (): ExpenseEntry[] => db.getExpenseEntries();
export const addExpenseEntry = (data: Omit<ExpenseEntry, 'id' | 'org_id' | 'created_at'>): ExpenseEntry => db.addExpenseEntry(data);
export const deleteExpenseEntry = (id: string): void => db.deleteExpenseEntry(id);

export const getOrgStats = () => db.getOrgStats();
export { db };
