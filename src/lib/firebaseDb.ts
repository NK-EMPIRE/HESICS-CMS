import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { dbInstance, isFirebaseConfigured } from './firebase';
import {
  Organization, User, Role, Client, Deal, Activity, Quotation, Invoice,
  IncomeEntry, ExpenseEntry, HesicsService, PrivateVaultItem
} from './types';
import {
  INITIAL_ORG, INITIAL_ROLES, INITIAL_CLIENTS,
  INITIAL_DEALS, INITIAL_ACTIVITIES, INITIAL_QUOTATIONS, INITIAL_INVOICES
} from './mockData';

const STORAGE_PREFIX = 'hesics_v3_';
export const ROOT_MASTER_EMAIL = 'hesics1@gmail.com';

// Permanent Immutable Root Account - CHIEF
export const ROOT_MASTER_USER: User = {
  id: 'usr-root-hesics',
  org_id: 'org-hesics-001',
  name: 'CHIEF',
  email: ROOT_MASTER_EMAIL,
  hierarchy: 'founder',
  role_id: 'role-admin',
  role_name: 'Admin',
  department: 'Executive Operations',
  is_active: true,
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HesicsChief',
  created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

export const INITIAL_SERVICES: HesicsService[] = [
  { id: 'srv-1', name: 'Enterprise Business OS Architecture & Cloud Infra', category: 'Technology', default_rate: 500000, description: 'Dedicated enterprise infrastructure, automated CI/CD, high-availability architecture', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-2', name: 'AI & Workflow Automation Engineering', category: 'Engineering', default_rate: 350000, description: 'Autonomous agent workflows, intelligent document processing, CRM automation pipelines', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-3', name: 'Commercial ERP & CRM Platform Retainer', category: 'Platform Retainer', default_rate: 250000, description: 'Ongoing enterprise operations, invoicing engine, multi-role RBAC management', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-4', name: 'Corporate Brand Identity & Design System', category: 'Design & Strategy', default_rate: 150000, description: 'High-ticket dark luxury aesthetic, brand typography, vector PDF templates', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-5', name: 'Full-Stack Web & Mobile Product Sprint', category: 'Product Delivery', default_rate: 400000, description: 'Custom full-stack web and mobile application sprint with zero compromises', is_active: true, created_at: new Date().toISOString() },
];

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

export class FirebaseDataStore {
  private org: Organization = getStorageItem('org', INITIAL_ORG);
  private users: User[] = getStorageItem('users', [ROOT_MASTER_USER]);
  private roles: Role[] = getStorageItem('roles', INITIAL_ROLES);
  private clients: Client[] = getStorageItem('clients', INITIAL_CLIENTS);
  private deals: Deal[] = getStorageItem('deals', INITIAL_DEALS);
  private activities: Activity[] = getStorageItem('activities', INITIAL_ACTIVITIES);
  private quotations: Quotation[] = getStorageItem('quotations', INITIAL_QUOTATIONS);
  private invoices: Invoice[] = getStorageItem('invoices', INITIAL_INVOICES);
  private incomeEntries: IncomeEntry[] = getStorageItem('income_entries', []);
  private expenseEntries: ExpenseEntry[] = getStorageItem('expense_entries', []);
  private services: HesicsService[] = getStorageItem('services', INITIAL_SERVICES);
  private privateVaultItems: PrivateVaultItem[] = getStorageItem('private_vault', []);

  constructor() {
    this.ensureRootMasterPresent();

    if (isFirebaseConfigured && dbInstance) {
      this.initFirestoreSync();
    }
  }

  private ensureRootMasterPresent() {
    const idx = this.users.findIndex(u => u.email.toLowerCase() === ROOT_MASTER_EMAIL);
    if (idx === -1) {
      this.users = [ROOT_MASTER_USER, ...this.users];
    } else {
      this.users[idx] = { ...this.users[idx], name: 'CHIEF', hierarchy: 'founder', is_active: true };
    }
    setStorageItem('users', this.users);
  }

  private initFirestoreSync() {
    const firestore = dbInstance;
    if (!firestore) return;

    try {
      onSnapshot(doc(firestore, 'organizations', this.org.id || 'org-hesics-001'), (snapshot) => {
        if (snapshot.exists()) {
          this.org = snapshot.data() as Organization;
          setStorageItem('org', this.org);
        }
      }, (err) => console.warn('Firestore Org notice:', err));

      onSnapshot(collection(firestore, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers = snapshot.docs.map(d => d.data() as User);
          const hasRoot = remoteUsers.some(u => u.email.toLowerCase() === ROOT_MASTER_EMAIL);
          this.users = hasRoot ? remoteUsers.map(u => u.email.toLowerCase() === ROOT_MASTER_EMAIL ? { ...u, name: 'CHIEF' } : u) : [ROOT_MASTER_USER, ...remoteUsers];
          setStorageItem('users', this.users);
        }
      }, (err) => console.warn('Firestore Users notice:', err));
    } catch (e) {
      console.warn('Firestore sync initialization notice:', e);
    }
  }

  async seedInitialFirestore() {
    const firestore = dbInstance;
    if (!firestore) return;

    try {
      const batch = writeBatch(firestore);
      batch.set(doc(firestore, 'organizations', this.org.id || 'org-hesics-001'), this.org, { merge: true });
      batch.set(doc(firestore, 'users', ROOT_MASTER_USER.id), ROOT_MASTER_USER, { merge: true });
      await batch.commit();
    } catch (e) {
      console.warn('Firestore seed notice:', e);
    }
  }

  // ── Organization ─────────────────────────────────────────────────────────────
  getOrg(): Organization {
    return this.org;
  }

  updateOrg(data: Partial<Organization>): Organization {
    this.org = { ...this.org, ...data };
    setStorageItem('org', this.org);
    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'organizations', this.org.id || 'org-hesics-001'), this.org, { merge: true }).catch(console.error);
    }
    return this.org;
  }

  // ── Users & Roles ────────────────────────────────────────────────────────────
  getUsers(viewerEmail?: string): User[] {
    const isRoot = (viewerEmail || '').trim().toLowerCase() === ROOT_MASTER_EMAIL;
    if (isRoot) {
      return this.users;
    }
    return this.users.filter((u) => u.email.toLowerCase() !== ROOT_MASTER_EMAIL);
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user: Omit<User, 'id' | 'org_id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.users = [...this.users, newUser];
    setStorageItem('users', this.users);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'users', newUser.id), newUser).catch(console.error);
    }
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const target = this.users.find((u) => u.id === id);
    if (target?.email.toLowerCase() === ROOT_MASTER_EMAIL) {
      updates = { ...updates, email: ROOT_MASTER_EMAIL, is_active: true, hierarchy: 'founder', name: 'CHIEF' };
    }

    this.users = this.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    setStorageItem('users', this.users);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, 'users', id), updates).catch(console.error);
    }
    return this.users.find((u) => u.id === id);
  }

  deactivateUser(id: string): void {
    const target = this.users.find((u) => u.id === id);
    if (target?.email.toLowerCase() === ROOT_MASTER_EMAIL) {
      console.warn('Chief admin cannot be deactivated.');
      return;
    }
    this.updateUser(id, { is_active: false });
  }

  removeUser(id: string): void {
    const target = this.users.find((u) => u.id === id);
    if (target?.email.toLowerCase() === ROOT_MASTER_EMAIL) {
      console.warn('Chief admin cannot be removed.');
      return;
    }
    this.users = this.users.filter((u) => u.id !== id);
    setStorageItem('users', this.users);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'users', id)).catch(console.error);
    }
  }

  getRoles(): Role[] {
    return this.roles;
  }

  addRole(role: Omit<Role, 'id' | 'org_id'>): Role {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}`,
      org_id: this.org.id,
    };
    this.roles = [...this.roles, newRole];
    setStorageItem('roles', this.roles);
    return newRole;
  }

  // ── Services Catalog (Chief Admin) ───────────────────────────────────────────
  getServices(): HesicsService[] {
    return this.services;
  }

  addService(service: Omit<HesicsService, 'id' | 'created_at'>): HesicsService {
    const newService: HesicsService = {
      ...service,
      id: `srv-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.services = [newService, ...this.services];
    setStorageItem('services', this.services);
    return newService;
  }

  updateService(id: string, updates: Partial<HesicsService>): HesicsService | undefined {
    this.services = this.services.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setStorageItem('services', this.services);
    return this.services.find((s) => s.id === id);
  }

  deleteService(id: string): void {
    this.services = this.services.filter((s) => s.id !== id);
    setStorageItem('services', this.services);
  }

  // ── Superadmin Private Vault ──────────────────────────────────────────────────
  getPrivateVaultItems(): PrivateVaultItem[] {
    return this.privateVaultItems;
  }

  addPrivateVaultItem(item: Omit<PrivateVaultItem, 'id' | 'created_at'>): PrivateVaultItem {
    const newItem: PrivateVaultItem = {
      ...item,
      id: `pvt-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.privateVaultItems = [newItem, ...this.privateVaultItems];
    setStorageItem('private_vault', this.privateVaultItems);
    return newItem;
  }

  updatePrivateVaultItem(id: string, updates: Partial<PrivateVaultItem>): PrivateVaultItem | undefined {
    this.privateVaultItems = this.privateVaultItems.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setStorageItem('private_vault', this.privateVaultItems);
    return this.privateVaultItems.find((p) => p.id === id);
  }

  deletePrivateVaultItem(id: string): void {
    this.privateVaultItems = this.privateVaultItems.filter((p) => p.id !== id);
    setStorageItem('private_vault', this.privateVaultItems);
  }

  // ── Clients ──────────────────────────────────────────────────────────────────
  getClients(): Client[] {
    return this.clients;
  }

  addClient(client: Omit<Client, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Client {
    const newClient: Client = {
      ...client,
      id: `client-${Date.now()}`,
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

  // ── Deals ────────────────────────────────────────────────────────────────────
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

  // ── Activities ───────────────────────────────────────────────────────────────
  getActivities(clientId?: string): Activity[] {
    if (clientId) {
      return this.activities.filter((a) => a.client_id === clientId);
    }
    return this.activities;
  }

  addActivity(activity: Omit<Activity, 'id' | 'org_id' | 'created_at'>): Activity {
    const newActivity: Activity = {
      ...activity,
      id: `act-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.activities = [newActivity, ...this.activities];
    setStorageItem('activities', this.activities);
    return newActivity;
  }

  // ── Quotations ───────────────────────────────────────────────────────────────
  getQuotations(): Quotation[] {
    return this.quotations;
  }

  addQuotation(quote: Omit<Quotation, 'id' | 'org_id' | 'created_at'>): Quotation {
    const newQuote: Quotation = {
      ...quote,
      id: `quote-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.quotations = [newQuote, ...this.quotations];
    setStorageItem('quotations', this.quotations);
    return newQuote;
  }

  updateQuotation(id: string, updates: Partial<Quotation>): Quotation | undefined {
    this.quotations = this.quotations.map((q) => (q.id === id ? { ...q, ...updates } : q));
    setStorageItem('quotations', this.quotations);
    return this.quotations.find((q) => q.id === id);
  }

  deleteQuotation(id: string): void {
    this.quotations = this.quotations.filter((q) => q.id !== id);
    setStorageItem('quotations', this.quotations);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────
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
    return newInv;
  }

  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const prev = this.invoices.find((i) => i.id === id);
    this.invoices = this.invoices.map((i) => (i.id === id ? { ...i, ...updates } : i));
    setStorageItem('invoices', this.invoices);

    if (updates.status === 'paid' && prev?.status !== 'paid') {
      const updated = this.invoices.find((i) => i.id === id);
      if (updated) {
        this.addIncomeEntry({
          source_type: 'invoice',
          source_id: updated.id,
          client_name: updated.client_name,
          amount: updated.total,
          currency: 'INR',
          category: 'Client Services / Invoice',
          received_at: new Date().toISOString().split('T')[0],
          payment_method: 'Direct Bank Transfer',
          notes: `Auto-recorded from paid Invoice #${updated.invoice_number}`,
        });
      }
    }

    return this.invoices.find((i) => i.id === id);
  }

  deleteInvoice(id: string): void {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    setStorageItem('invoices', this.invoices);
  }

  // ── Finance (Income & Expenses) ──────────────────────────────────────────────
  getIncomeEntries(): IncomeEntry[] {
    return this.incomeEntries;
  }

  addIncomeEntry(entry: Omit<IncomeEntry, 'id' | 'org_id' | 'created_at'>): IncomeEntry {
    const newEntry: IncomeEntry = {
      ...entry,
      id: `inc-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.incomeEntries = [newEntry, ...this.incomeEntries];
    setStorageItem('income_entries', this.incomeEntries);
    return newEntry;
  }

  deleteIncomeEntry(id: string): void {
    this.incomeEntries = this.incomeEntries.filter((i) => i.id !== id);
    setStorageItem('income_entries', this.incomeEntries);
  }

  getExpenseEntries(): ExpenseEntry[] {
    return this.expenseEntries;
  }

  addExpenseEntry(entry: Omit<ExpenseEntry, 'id' | 'org_id' | 'created_at'>): ExpenseEntry {
    const newEntry: ExpenseEntry = {
      ...entry,
      id: `exp-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.expenseEntries = [newEntry, ...this.expenseEntries];
    setStorageItem('expense_entries', this.expenseEntries);
    return newEntry;
  }

  deleteExpenseEntry(id: string): void {
    this.expenseEntries = this.expenseEntries.filter((e) => e.id !== id);
    setStorageItem('expense_entries', this.expenseEntries);
  }

  // ── Executive Stats ──────────────────────────────────────────────────────────
  getOrgStats() {
    const totalIncome = this.incomeEntries.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = this.expenseEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    const activePipelineValue = this.deals
      .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
      .reduce((sum, d) => sum + Number(d.value), 0);

    const wonRevenue = this.deals
      .filter((d) => d.stage === 'won')
      .reduce((sum, d) => sum + Number(d.value), 0);

    const totalDeals = this.deals.length;
    const totalInvoiced = this.invoices.reduce((sum, i) => sum + Number(i.total), 0);
    const cashCollected = this.invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.total), 0);
    const activeClients = this.clients.filter((c) => c.status === 'active').length;
    const totalClients = this.clients.length;
    const overdueFollowUps = this.activities.filter(a => a.follow_up_date && new Date(a.follow_up_date) < new Date()).length;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      activePipelineValue,
      wonRevenue,
      totalDeals,
      totalInvoiced,
      cashCollected,
      activeClients,
      totalClients,
      overdueFollowUps,
    };
  }

  resetAll(): void {
    localStorage.removeItem(`${STORAGE_PREFIX}org`);
    localStorage.removeItem(`${STORAGE_PREFIX}roles`);
    localStorage.removeItem(`${STORAGE_PREFIX}clients`);
    localStorage.removeItem(`${STORAGE_PREFIX}deals`);
    localStorage.removeItem(`${STORAGE_PREFIX}activities`);
    localStorage.removeItem(`${STORAGE_PREFIX}quotations`);
    localStorage.removeItem(`${STORAGE_PREFIX}invoices`);
    localStorage.removeItem(`${STORAGE_PREFIX}income_entries`);
    localStorage.removeItem(`${STORAGE_PREFIX}expense_entries`);
    localStorage.removeItem(`${STORAGE_PREFIX}services`);
    localStorage.removeItem(`${STORAGE_PREFIX}private_vault`);

    this.users = [ROOT_MASTER_USER];
    setStorageItem('users', this.users);

    window.location.reload();
  }
}

export const db = new FirebaseDataStore();
