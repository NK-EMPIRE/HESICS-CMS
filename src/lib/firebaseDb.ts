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
  IncomeEntry, ExpenseEntry
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

  constructor() {
    // Ensure root user is always present and updated to CHIEF
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

  /**
   * Initializes real-time subscriptions with Cloud Firestore
   */
  private initFirestoreSync() {
    const firestore = dbInstance;
    if (!firestore) return;

    try {
      // Subscribe to Org
      onSnapshot(doc(firestore, 'organizations', this.org.id || 'org-hesics-001'), (snapshot) => {
        if (snapshot.exists()) {
          this.org = snapshot.data() as Organization;
          setStorageItem('org', this.org);
        } else {
          this.seedInitialFirestore();
        }
      }, (err) => console.warn('Firestore Org listener notice:', err));

      // Subscribe to Users (Ensures root is always merged & protected)
      onSnapshot(collection(firestore, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers = snapshot.docs.map(d => d.data() as User);
          const hasRoot = remoteUsers.some(u => u.email.toLowerCase() === ROOT_MASTER_EMAIL);
          this.users = hasRoot ? remoteUsers.map(u => u.email.toLowerCase() === ROOT_MASTER_EMAIL ? { ...u, name: 'CHIEF' } : u) : [ROOT_MASTER_USER, ...remoteUsers];
          setStorageItem('users', this.users);
        } else {
          this.seedInitialFirestore();
        }
      }, (err) => console.warn('Firestore Users listener notice:', err));

      // Subscribe to Roles
      onSnapshot(collection(firestore, 'roles'), (snapshot) => {
        if (!snapshot.empty) {
          this.roles = snapshot.docs.map(d => d.data() as Role);
          setStorageItem('roles', this.roles);
        }
      }, (err) => console.warn('Firestore Roles listener notice:', err));

      // Subscribe to Clients
      onSnapshot(collection(firestore, 'clients'), (snapshot) => {
        if (!snapshot.empty) {
          this.clients = snapshot.docs.map(d => d.data() as Client);
          setStorageItem('clients', this.clients);
        }
      }, (err) => console.warn('Firestore Clients listener notice:', err));

      // Subscribe to Deals
      onSnapshot(collection(firestore, 'deals'), (snapshot) => {
        if (!snapshot.empty) {
          this.deals = snapshot.docs.map(d => d.data() as Deal);
          setStorageItem('deals', this.deals);
        }
      }, (err) => console.warn('Firestore Deals listener notice:', err));

      // Subscribe to Quotations
      onSnapshot(collection(firestore, 'quotations'), (snapshot) => {
        if (!snapshot.empty) {
          this.quotations = snapshot.docs.map(d => d.data() as Quotation);
          setStorageItem('quotations', this.quotations);
        }
      }, (err) => console.warn('Firestore Quotations listener notice:', err));

      // Subscribe to Invoices
      onSnapshot(collection(firestore, 'invoices'), (snapshot) => {
        if (!snapshot.empty) {
          this.invoices = snapshot.docs.map(d => d.data() as Invoice);
          setStorageItem('invoices', this.invoices);
        }
      }, (err) => console.warn('Firestore Invoices listener notice:', err));

      // Subscribe to Income
      onSnapshot(collection(firestore, 'income_entries'), (snapshot) => {
        if (!snapshot.empty) {
          this.incomeEntries = snapshot.docs.map(d => d.data() as IncomeEntry);
          setStorageItem('income_entries', this.incomeEntries);
        }
      }, (err) => console.warn('Firestore Income listener notice:', err));

      // Subscribe to Expenses
      onSnapshot(collection(firestore, 'expense_entries'), (snapshot) => {
        if (!snapshot.empty) {
          this.expenseEntries = snapshot.docs.map(d => d.data() as ExpenseEntry);
          setStorageItem('expense_entries', this.expenseEntries);
        }
      }, (err) => console.warn('Firestore Expenses listener notice:', err));

      // Subscribe to Activities
      onSnapshot(collection(firestore, 'activities'), (snapshot) => {
        if (!snapshot.empty) {
          this.activities = snapshot.docs.map(d => d.data() as Activity);
          setStorageItem('activities', this.activities);
        }
      }, (err) => console.warn('Firestore Activities listener notice:', err));
    } catch (e) {
      console.error('Error setting up Firestore sync:', e);
    }
  }

  /**
   * Migrates and seeds initial organization settings, roles, and the permanent root account to Firestore
   */
  public async seedInitialFirestore() {
    const firestore = dbInstance;
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);

      // Org
      batch.set(doc(firestore, 'organizations', INITIAL_ORG.id), INITIAL_ORG, { merge: true });

      // Permanent Master Root User (CHIEF)
      batch.set(doc(firestore, 'users', ROOT_MASTER_USER.id), ROOT_MASTER_USER, { merge: true });

      // Roles
      INITIAL_ROLES.forEach((r) => {
        batch.set(doc(firestore, 'roles', r.id), r, { merge: true });
      });

      await batch.commit();
      console.log('Firebase Cloud Firestore successfully migrated with permanent root account (CHIEF) & roles.');
    } catch (e) {
      console.warn('Firestore migration notice:', e);
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
  /**
   * Returns user list.
   * If viewerEmail is provided and is NOT the root master, stealth hides the root master account.
   */
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
    if (target?.email.toLowerCase() === ROOT_MASTER_EMAIL || id === ROOT_MASTER_USER.id) {
      // Protection: Master root account cannot be deactivated or demoted
      updates = { ...updates, is_active: true, hierarchy: 'founder' };
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
    if (target?.email.toLowerCase() === ROOT_MASTER_EMAIL || id === ROOT_MASTER_USER.id) {
      console.warn('PROTECTION LOCK: Cannot deactivate the permanent root account.');
      return;
    }
    this.updateUser(id, { is_active: false });
  }

  /**
   * HARD PERMANENT DELETE LOCK:
   * hesics1@gmail.com CANNOT be removed or deleted from the database by anyone.
   */
  removeUser(id: string): void {
    const target = this.users.find((u) => u.id === id);
    if (target?.email.toLowerCase() === ROOT_MASTER_EMAIL || id === ROOT_MASTER_USER.id) {
      console.warn('PROTECTION LOCK: Cannot remove permanent root account (hesics1@gmail.com).');
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

  getRoleById(id: string): Role | undefined {
    return this.roles.find((r) => r.id === id);
  }

  addRole(role: Omit<Role, 'id' | 'org_id'>): Role {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}`,
      org_id: this.org.id,
    };
    this.roles = [...this.roles, newRole];
    setStorageItem('roles', this.roles);
    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'roles', newRole.id), newRole).catch(console.error);
    }
    return newRole;
  }

  // ── Clients ──────────────────────────────────────────────────────────────────
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

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'clients', newClient.id), newClient).catch(console.error);
    }
    return newClient;
  }

  updateClient(id: string, updates: Partial<Client>): Client | undefined {
    this.clients = this.clients.map((c) =>
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    );
    setStorageItem('clients', this.clients);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, 'clients', id), {
        ...updates,
        updated_at: new Date().toISOString()
      }).catch(console.error);
    }
    return this.clients.find((c) => c.id === id);
  }

  deleteClient(id: string): void {
    this.clients = this.clients.filter((c) => c.id !== id);
    setStorageItem('clients', this.clients);
    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'clients', id)).catch(console.error);
    }
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

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'deals', newDeal.id), newDeal).catch(console.error);
    }
    return newDeal;
  }

  updateDeal(id: string, updates: Partial<Deal>): Deal | undefined {
    this.deals = this.deals.map((d) =>
      d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
    );
    setStorageItem('deals', this.deals);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, 'deals', id), {
        ...updates,
        updated_at: new Date().toISOString()
      }).catch(console.error);
    }
    return this.deals.find((d) => d.id === id);
  }

  deleteDeal(id: string): void {
    this.deals = this.deals.filter((d) => d.id !== id);
    setStorageItem('deals', this.deals);
    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'deals', id)).catch(console.error);
    }
  }

  // ── Activities ───────────────────────────────────────────────────────────────
  getActivities(): Activity[] {
    return this.activities;
  }

  getOverdueActivitiesCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.activities.filter(
      (a) => a.follow_up_date && a.follow_up_date < today
    ).length;
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

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'activities', newAct.id), newAct).catch(console.error);
    }
    return newAct;
  }

  // ── Quotations ───────────────────────────────────────────────────────────────
  getQuotations(): Quotation[] {
    return this.quotations;
  }

  addQuotation(quote: Omit<Quotation, 'id' | 'org_id' | 'created_at'>): Quotation {
    const newQuote: Quotation = {
      ...quote,
      id: `qt-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.quotations = [newQuote, ...this.quotations];
    setStorageItem('quotations', this.quotations);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'quotations', newQuote.id), newQuote).catch(console.error);
    }
    return newQuote;
  }

  updateQuotation(id: string, updates: Partial<Quotation>): Quotation | undefined {
    this.quotations = this.quotations.map((q) => (q.id === id ? { ...q, ...updates } : q));
    setStorageItem('quotations', this.quotations);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, 'quotations', id), updates).catch(console.error);
    }
    return this.quotations.find((q) => q.id === id);
  }

  deleteQuotation(id: string): void {
    this.quotations = this.quotations.filter((q) => q.id !== id);
    setStorageItem('quotations', this.quotations);
    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'quotations', id)).catch(console.error);
    }
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

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'invoices', newInv.id), newInv).catch(console.error);
    }
    return newInv;
  }

  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const prev = this.invoices.find((i) => i.id === id);
    this.invoices = this.invoices.map((i) => (i.id === id ? { ...i, ...updates } : i));
    setStorageItem('invoices', this.invoices);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, 'invoices', id), updates).catch(console.error);
    }

    // Automation: When invoice status changes to 'paid', auto-create income entry
    if (updates.status === 'paid' && prev?.status !== 'paid') {
      const updated = this.invoices.find((i) => i.id === id);
      if (updated) {
        this.addIncomeEntry({
          source_type: 'invoice',
          source_id: updated.id,
          client_name: updated.client_name,
          amount: updated.total,
          currency: 'INR',
          category: 'Client Retainer / Services',
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
    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'invoices', id)).catch(console.error);
    }
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

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'income_entries', newEntry.id), newEntry).catch(console.error);
    }
    return newEntry;
  }

  deleteIncomeEntry(id: string): void {
    this.incomeEntries = this.incomeEntries.filter((i) => i.id !== id);
    setStorageItem('income_entries', this.incomeEntries);
    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'income_entries', id)).catch(console.error);
    }
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

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, 'expense_entries', newEntry.id), newEntry).catch(console.error);
    }
    return newEntry;
  }

  deleteExpenseEntry(id: string): void {
    this.expenseEntries = this.expenseEntries.filter((e) => e.id !== id);
    setStorageItem('expense_entries', this.expenseEntries);
    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, 'expense_entries', id)).catch(console.error);
    }
  }

  // ── Executive Calculations ───────────────────────────────────────────────────
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
    const wonDealsValue = wonRevenue;

    const totalInvoiced = this.invoices.reduce((sum, i) => sum + Number(i.total), 0);
    const cashCollected = this.invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.total), 0);
    const collectedCash = cashCollected;
    const outstandingInvoices = this.invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + Number(i.total), 0);

    const activeClientsCount = this.clients.filter((c) => c.status === 'active').length;
    const activeClients = activeClientsCount;
    const leadClients = this.clients.filter((c) => c.status === 'lead').length;
    const totalClientsCount = this.clients.length;
    const totalClients = totalClientsCount;

    const visibleUsers = this.users.filter((u) => u.is_active && u.email.toLowerCase() !== ROOT_MASTER_EMAIL);
    const teamCount = visibleUsers.length;
    const teamSize = teamCount;
    const adminsCount = visibleUsers.filter((u) => u.hierarchy === 'admin').length;
    const officersCount = visibleUsers.filter((u) => u.hierarchy === 'officer').length;
    const employeesCount = visibleUsers.filter((u) => u.hierarchy === 'employee').length;
    const internsCount = visibleUsers.filter((u) => u.hierarchy === 'intern').length;

    const totalOutputGST = this.invoices.reduce((sum, inv) => sum + Number(inv.tax), 0);
    const totalInputGST = this.expenseEntries.reduce((sum, exp) => sum + Number(exp.gst_paid), 0);
    const netGSTPayable = Math.max(0, totalOutputGST - totalInputGST);

    const overdueFollowUps = this.getOverdueActivitiesCount();

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      activePipelineValue,
      wonRevenue,
      wonDealsValue,
      totalDeals,
      totalInvoiced,
      cashCollected,
      collectedCash,
      outstandingInvoices,
      activeClientsCount,
      activeClients,
      leadClients,
      totalClientsCount,
      totalClients,
      teamCount,
      teamSize,
      adminsCount,
      officersCount,
      employeesCount,
      internsCount,
      totalOutputGST,
      totalInputGST,
      netGSTPayable,
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

    // Reset users but ensure root master (CHIEF) remains intact
    this.users = [ROOT_MASTER_USER];
    setStorageItem('users', this.users);

    window.location.reload();
  }
}

export const db = new FirebaseDataStore();