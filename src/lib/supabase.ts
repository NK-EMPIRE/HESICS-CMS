import { createClient } from '@supabase/supabase-js';
import {
  Organization, User, Role, Client, Deal, Activity, Quotation, Invoice,
  IncomeEntry, ExpenseEntry
} from './types';
import {
  INITIAL_ORG, INITIAL_USERS, INITIAL_ROLES, INITIAL_CLIENTS,
  INITIAL_DEALS, INITIAL_ACTIVITIES, INITIAL_QUOTATIONS, INITIAL_INVOICES
} from './mockData';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const STORAGE_PREFIX = 'hesics_v2_';

const getStorageItem = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
};

class DataStore {
  private org: Organization = getStorageItem('org', INITIAL_ORG);
  private users: User[] = getStorageItem('users', INITIAL_USERS);
  private roles: Role[] = getStorageItem('roles', INITIAL_ROLES);
  private clients: Client[] = getStorageItem('clients', INITIAL_CLIENTS);
  private deals: Deal[] = getStorageItem('deals', INITIAL_DEALS);
  private activities: Activity[] = getStorageItem('activities', INITIAL_ACTIVITIES);
  private quotations: Quotation[] = getStorageItem('quotations', INITIAL_QUOTATIONS);
  private invoices: Invoice[] = getStorageItem('invoices', INITIAL_INVOICES);
  private incomeEntries: IncomeEntry[] = getStorageItem('income_entries', []);
  private expenseEntries: ExpenseEntry[] = getStorageItem('expense_entries', []);

  // Organization
  getOrg(): Organization {
    return this.org;
  }
  updateOrg(data: Partial<Organization>): Organization {
    this.org = { ...this.org, ...data };
    setStorageItem('org', this.org);
    return this.org;
  }

  // Users & Roles
  getUsers(): User[] {
    return this.users;
  }
  getRoles(): Role[] {
    return this.roles;
  }

  // Clients
  getClients(): Client[] {
    return this.clients;
  }
  addClient(client: Omit<Client, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Client {
    const newClient: Client = {
      ...client,
      id: `cli-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.clients = [newClient, ...this.clients];
    setStorageItem('clients', this.clients);
    return newClient;
  }
  updateClient(id: string, updates: Partial<Client>): Client | undefined {
    this.clients = this.clients.map((c) =>
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    );
    setStorageItem('clients', this.clients);
    return this.clients.find((c) => c.id === id);
  }
  deleteClient(id: string): void {
    this.clients = this.clients.filter((c) => c.id !== id);
    setStorageItem('clients', this.clients);
  }

  // Deals
  getDeals(): Deal[] {
    return this.deals;
  }
  addDeal(deal: Omit<Deal, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Deal {
    const newDeal: Deal = {
      ...deal,
      id: `deal-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.deals = [newDeal, ...this.deals];
    setStorageItem('deals', this.deals);
    return newDeal;
  }
  updateDeal(id: string, updates: Partial<Deal>): Deal | undefined {
    this.deals = this.deals.map((d) =>
      d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
    );
    setStorageItem('deals', this.deals);
    return this.deals.find((d) => d.id === id);
  }
  deleteDeal(id: string): void {
    this.deals = this.deals.filter((d) => d.id !== id);
    setStorageItem('deals', this.deals);
  }

  // Activities
  getActivities(): Activity[] {
    return this.activities;
  }
  addActivity(act: Omit<Activity, 'id' | 'org_id' | 'created_at'>): Activity {
    const newAct: Activity = {
      ...act,
      id: `act-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.activities = [newAct, ...this.activities];
    setStorageItem('activities', this.activities);
    return newAct;
  }

  // Quotations
  getQuotations(): Quotation[] {
    return this.quotations;
  }
  addQuotation(q: Omit<Quotation, 'id' | 'org_id' | 'created_at'>): Quotation {
    const newQ: Quotation = {
      ...q,
      id: `quote-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.quotations = [newQ, ...this.quotations];
    setStorageItem('quotations', this.quotations);
    return newQ;
  }
  updateQuotation(id: string, updates: Partial<Quotation>): Quotation | undefined {
    this.quotations = this.quotations.map((q) => (q.id === id ? { ...q, ...updates } : q));
    setStorageItem('quotations', this.quotations);
    return this.quotations.find((q) => q.id === id);
  }

  // Invoices
  getInvoices(): Invoice[] {
    return this.invoices;
  }
  addInvoice(inv: Omit<Invoice, 'id' | 'org_id' | 'created_at'>): Invoice {
    const newInv: Invoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.invoices = [newInv, ...this.invoices];
    setStorageItem('invoices', this.invoices);

    // Auto add paid invoice to income entries
    if (inv.status === 'paid') {
      this.addIncomeEntry({
        source_type: 'invoice',
        source_id: newInv.id,
        client_name: inv.client_name,
        amount: inv.total,
        currency: 'INR',
        category: 'Client Retainer / Project Invoice',
        received_at: inv.paid_at ? inv.paid_at.split('T')[0] : new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer / UPI',
        notes: `Auto logged from Invoice #${inv.invoice_number}`,
      });
    }

    return newInv;
  }
  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    this.invoices = this.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
    setStorageItem('invoices', this.invoices);
    const updatedInv = this.invoices.find((inv) => inv.id === id);

    // If marked paid, ensure income entry exists
    if (updatedInv && updates.status === 'paid') {
      const exists = this.incomeEntries.some((inc) => inc.source_id === updatedInv.id);
      if (!exists) {
        this.addIncomeEntry({
          source_type: 'invoice',
          source_id: updatedInv.id,
          client_name: updatedInv.client_name,
          amount: updatedInv.total,
          currency: 'INR',
          category: 'Client Invoice',
          received_at: updatedInv.paid_at ? updatedInv.paid_at.split('T')[0] : new Date().toISOString().split('T')[0],
          payment_method: 'Bank Transfer / UPI',
          notes: `Auto logged from Invoice #${updatedInv.invoice_number}`,
        });
      }
    }

    return updatedInv;
  }

  // Phase 2 Finance Engine
  getIncomeEntries(): IncomeEntry[] {
    return this.incomeEntries;
  }
  addIncomeEntry(entry: Omit<IncomeEntry, 'id' | 'org_id' | 'created_at'>): IncomeEntry {
    const newInc: IncomeEntry = {
      ...entry,
      id: `inc-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.incomeEntries = [newInc, ...this.incomeEntries];
    setStorageItem('income_entries', this.incomeEntries);
    return newInc;
  }

  getExpenseEntries(): ExpenseEntry[] {
    return this.expenseEntries;
  }
  addExpenseEntry(exp: Omit<ExpenseEntry, 'id' | 'org_id' | 'created_at'>): ExpenseEntry {
    const newExp: ExpenseEntry = {
      ...exp,
      id: `exp-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.expenseEntries = [newExp, ...this.expenseEntries];
    setStorageItem('expense_entries', this.expenseEntries);
    return newExp;
  }
  deleteExpenseEntry(id: string): void {
    this.expenseEntries = this.expenseEntries.filter((e) => e.id !== id);
    setStorageItem('expense_entries', this.expenseEntries);
  }

  // Reset database
  resetAll(): void {
    localStorage.clear();
    this.org = INITIAL_ORG;
    this.users = INITIAL_USERS;
    this.roles = INITIAL_ROLES;
    this.clients = [];
    this.deals = [];
    this.activities = [];
    this.quotations = [];
    this.invoices = [];
    this.incomeEntries = [];
    this.expenseEntries = [];
    window.location.reload();
  }
}

export const db = new DataStore();
