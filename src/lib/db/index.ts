import {
  Organization,
  User,
  Role,
  Client,
  Deal,
  Activity,
  Quotation,
  Invoice,
  IncomeEntry,
  ExpenseEntry,
  HesicsService,
  PrivateVaultItem,
  ClientAgreement,
  MeetingItem,
  NotionWorkspaceDoc,
} from "../types";
import { dbInstance, isFirebaseConfigured } from "../firebase";
import {
  collection,
  query,
  where,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  INITIAL_ORG,
  INITIAL_ROLES,
  INITIAL_CLIENTS,
  INITIAL_DEALS,
  INITIAL_ACTIVITIES,
  INITIAL_QUOTATIONS,
  INITIAL_INVOICES,
} from "../mockData";
import {
  logAudit,
  AuditLogEntry,
  getAuditLog,
  clearAuditLog,
} from "../auditLog";

const STORAGE_PREFIX = "hesics_v3_";
export const ROOT_MASTER_EMAIL = "hesics1@gmail.com";

// Permanent Immutable Root Account - CHIEF (Stealth Admin)
export const ROOT_MASTER_USER: User = {
  id: "usr-root-hesics",
  org_id: "org-hesics-001",
  name: "CHIEF",
  email: ROOT_MASTER_EMAIL,
  hierarchy: "founder",
  role_id: "role-admin",
  role_name: "Admin",
  department: "Executive Operations",
  is_active: true,
  avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=HesicsChief",
  created_at: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

export const INITIAL_SERVICES: HesicsService[] = [
  {
    id: "srv-1",
    name: "Enterprise Business OS Architecture & Cloud Infra",
    category: "Technology",
    default_rate: 500000,
    description:
      "Dedicated enterprise infrastructure, automated CI/CD, high-availability architecture",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-2",
    name: "AI & Workflow Automation Engineering",
    category: "Engineering",
    default_rate: 350000,
    description:
      "Autonomous agent workflows, intelligent document processing, CRM automation pipelines",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-3",
    name: "Commercial ERP & CRM Platform Retainer",
    category: "Platform Retainer",
    default_rate: 250000,
    description:
      "Ongoing enterprise operations, invoicing engine, multi-role RBAC management",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-4",
    name: "Corporate Brand Identity & Design System",
    category: "Design & Strategy",
    default_rate: 150000,
    description:
      "High-ticket dark luxury aesthetic, brand typography, vector PDF templates",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-5",
    name: "Full-Stack Web & Mobile Product Sprint",
    category: "Product Delivery",
    default_rate: 400000,
    description:
      "Custom full-stack web and mobile application sprint with zero compromises",
    is_active: true,
    created_at: new Date().toISOString(),
  },
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
    console.error("LocalStorage write error:", e);
  }
};

export class FirebaseDataStore {
  private org: Organization = getStorageItem("org", INITIAL_ORG);
  private users: User[] = getStorageItem("users", [ROOT_MASTER_USER]);
  private roles: Role[] = getStorageItem("roles", INITIAL_ROLES);
  private clients: Client[] = getStorageItem("clients", INITIAL_CLIENTS);
  private deals: Deal[] = getStorageItem("deals", INITIAL_DEALS);
  private activities: Activity[] = getStorageItem(
    "activities",
    INITIAL_ACTIVITIES,
  );
  private quotations: Quotation[] = getStorageItem(
    "quotations",
    INITIAL_QUOTATIONS,
  );
  private invoices: Invoice[] = getStorageItem("invoices", INITIAL_INVOICES);
  private incomeEntries: IncomeEntry[] = getStorageItem("income_entries", []);
  private expenseEntries: ExpenseEntry[] = getStorageItem(
    "expense_entries",
    [],
  );
  private meetings: MeetingItem[] = getStorageItem("meetings", []);
  private notionDocs: Record<string, NotionWorkspaceDoc> = getStorageItem(
    "notion_docs",
    {},
  );
  private services: HesicsService[] = getStorageItem(
    "services",
    INITIAL_SERVICES,
  );
  private privateVaultItems: PrivateVaultItem[] = getStorageItem(
    "private_vault",
    [],
  );
  private agreements: ClientAgreement[] = getStorageItem("agreements", []);
  private listeners: Set<() => void> = new Set();
  private persistenceState: "local" | "connecting" | "synced" | "error" = isFirebaseConfigured ? "connecting" : "local";
  private persistenceError = "";

  getPersistenceStatus(): { state: "local" | "connecting" | "synced" | "error"; error?: string } {
    return {
      state: this.persistenceState,
      error: this.persistenceError || undefined,
    };
  }

  private markPersistenceSynced() {
    this.persistenceState = "synced";
    this.persistenceError = "";
  }

  private markPersistenceError(error: unknown) {
    this.persistenceState = "error";
    this.persistenceError = error instanceof Error ? error.message : "Remote data synchronization failed.";
    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error("Store listener error:", e);
      }
    });
  }

  constructor() {
    this.ensureRootMasterPresent();
    this.ensureSuperadminRolePresent();

    if (isFirebaseConfigured && dbInstance) {
      this.initFirestoreSync();
    }
  }

  private ensureSuperadminRolePresent() {
    if (!this.roles.some((r) => r.id === "role-superadmin")) {
      this.roles = [
        {
          id: "role-superadmin",
          org_id: this.org.id,
          name: "Superadmin",
          description:
            "Executive governance authority with isolated Private Vault, ledger & tasks.",
          hierarchy_level: "superadmin",
        },
        ...this.roles,
      ];
      setStorageItem("roles", this.roles);
    }
  }

  private ensureRootMasterPresent() {
    const idx = this.users.findIndex(
      (u) => u.email.toLowerCase() === ROOT_MASTER_EMAIL,
    );
    if (idx === -1) {
      this.users = [ROOT_MASTER_USER, ...this.users];
    } else {
      this.users[idx] = {
        ...this.users[idx],
        name: "CHIEF",
        hierarchy: "founder",
        is_active: true,
      };
    }
    setStorageItem("users", this.users);
  }

  private initFirestoreSync() {
    const firestore = dbInstance;
    if (!firestore) return;

    try {
      const orgCollection = (name: string) =>
        query(collection(firestore, name), where("org_id", "==", this.org.id));

      // 0. Organization Settings real-time sync
      onSnapshot(
        collection(firestore, "organization"),
        (snapshot) => {
          if (!snapshot.empty) {
            const docData = snapshot.docs[0]?.data() as Organization;
            if (docData && docData.name) {
              this.org = { ...this.org, ...docData };
              setStorageItem("org", this.org);
              this.markPersistenceSynced();
              this.notify();
            }
          }
        },
        (err) =>
          console.warn("Firestore organization sync notice:", err.message),
      );

      // 1. Users real-time sync
      onSnapshot(
        orgCollection("users"),
        (snapshot) => {
          const list: User[] = [];
          snapshot.forEach((d) => list.push(d.data() as User));
          // Keep ROOT_MASTER_USER intact while treating an empty remote collection as authoritative.
          const hasRoot = list.some(
            (u) => u.email.toLowerCase() === ROOT_MASTER_EMAIL,
          );
          this.users = hasRoot ? list : [ROOT_MASTER_USER, ...list];
          setStorageItem("users", this.users);
          this.notify();
        },
        (err) => console.warn("Firestore users sync notice:", err.message),
      );

      // 2. Clients real-time sync
      onSnapshot(
        orgCollection("clients"),
        (snapshot) => {
          const list: Client[] = [];
          snapshot.forEach((d) => list.push(d.data() as Client));
          this.clients = list;
          setStorageItem("clients", list);
          this.notify();
          this.markPersistenceSynced();
        },
        (err) => {
          console.warn("Firestore clients sync notice:", err.message);
          this.markPersistenceError(err);
        },
      );

      // 3. Deals real-time sync
      onSnapshot(
        orgCollection("deals"),
        (snapshot) => {
          const list: Deal[] = [];
          snapshot.forEach((d) => list.push(d.data() as Deal));
          this.deals = list;
          setStorageItem("deals", list);
          this.notify();
        },
        (err) => console.warn("Firestore deals sync notice:", err.message),
      );

      // 4. Invoices real-time sync
      onSnapshot(
        orgCollection("invoices"),
        (snapshot) => {
          const list: Invoice[] = [];
          snapshot.forEach((d) => list.push(d.data() as Invoice));
          this.invoices = list;
          setStorageItem("invoices", list);
          this.notify();
        },
        (err) => console.warn("Firestore invoices sync notice:", err.message),
      );

      // 5. Quotations real-time sync
      onSnapshot(
        orgCollection("quotations"),
        (snapshot) => {
          const list: Quotation[] = [];
          snapshot.forEach((d) => list.push(d.data() as Quotation));
          this.quotations = list;
          setStorageItem("quotations", list);
          this.notify();
        },
        (err) => console.warn("Firestore quotations sync notice:", err.message),
      );

      // 6. Agreements real-time sync
      onSnapshot(
        orgCollection("agreements"),
        (snapshot) => {
          const list: ClientAgreement[] = [];
          snapshot.forEach((d) => list.push(d.data() as ClientAgreement));
          this.agreements = list;
          setStorageItem("agreements", list);
          this.notify();
        },
        (err) => console.warn("Firestore agreements sync notice:", err.message),
      );

      // 7. Income Entries real-time sync
      onSnapshot(
        orgCollection("income_entries"),
        (snapshot) => {
          const list: IncomeEntry[] = [];
          snapshot.forEach((d) => list.push(d.data() as IncomeEntry));
          this.incomeEntries = list;
          setStorageItem("income_entries", list);
          this.notify();
        },
        (err) => console.warn("Firestore income sync notice:", err.message),
      );

      // 9. Meetings real-time sync
      onSnapshot(
        orgCollection("meetings"),
        (snapshot) => {
          const list: MeetingItem[] = [];
          snapshot.forEach((d) => list.push(d.data() as MeetingItem));
          this.meetings = list;
          setStorageItem("meetings", list);
          this.notify();
        },
        (err) => console.warn("Firestore meetings sync notice:", err.message),
      );

      // 10. Notion Workspaces real-time sync
      onSnapshot(
        orgCollection("notion_workspaces"),
        (snapshot) => {
          if (!snapshot.empty) {
            const map: Record<string, NotionWorkspaceDoc> = {};
            snapshot.forEach((d) => {
              const data = d.data() as NotionWorkspaceDoc;
              if (data && data.id) map[data.id] = data;
            });
            this.notionDocs = { ...this.notionDocs, ...map };
            setStorageItem("notion_docs", this.notionDocs);
          }
        },
        (err) =>
          console.warn("Firestore notion_workspaces sync notice:", err.message),
      );

      // 8. Expense Entries real-time sync
      onSnapshot(
        orgCollection("expense_entries"),
        (snapshot) => {
          const list: ExpenseEntry[] = [];
          snapshot.forEach((d) => list.push(d.data() as ExpenseEntry));
          this.expenseEntries = list;
          setStorageItem("expense_entries", list);
          this.notify();
        },
        (err) => console.warn("Firestore expense sync notice:", err.message),
      );
    } catch (err) {
      console.warn("Firestore real-time listeners initialization error:", err);
    }
  }

  // ── Organization & Settings ──────────────────────────────────────────────────
  getOrg(): Organization {
    return this.org;
  }

  updateOrg(updates: Partial<Organization>): Organization {
    this.org = { ...this.org, ...updates };
    setStorageItem("org", this.org);

    logAudit(
      "usr-system",
      "Executive Admin",
      "org.updated",
      "Organization",
      this.org.id,
      this.org.name,
      {
        is_tax_enabled: this.org.is_tax_enabled,
        default_invoice_template: this.org.default_invoice_template,
      },
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "organization", this.org.id), this.org, {
        merge: true,
      })
        .then(() => this.markPersistenceSynced())
        .catch((error) => {
          console.error("Organization persistence failed:", error);
          this.markPersistenceError(error);
        });
    }
    return this.org;
  }

  // ── Users & Team Members ──────────────────────────────────────────────────────
  getUsers(requesterEmail?: string): User[] {
    const isChief =
      (requesterEmail || "").trim().toLowerCase() === ROOT_MASTER_EMAIL;
    if (isChief) {
      return this.users;
    }
    return this.users.filter(
      (u) => u.email.toLowerCase() !== ROOT_MASTER_EMAIL,
    );
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  addUser(user: Omit<User, "id" | "org_id" | "created_at">): User {
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.users = [...this.users, newUser];
    setStorageItem("users", this.users);

    logAudit(
      "usr-system",
      "Executive Admin",
      "user.invited",
      "User",
      newUser.id,
      `${newUser.name} (${newUser.email})`,
      {
        role_name: newUser.role_name,
        department: newUser.department,
        hierarchy: newUser.hierarchy,
      },
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "users", newUser.id), newUser).catch(console.error);
    }
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const target = this.users.find((u) => u.id === id);
    if (target && target.email.toLowerCase() === ROOT_MASTER_EMAIL) {
      if (updates.hierarchy && updates.hierarchy !== "founder") {
        delete updates.hierarchy;
      }
      if (updates.is_active === false) {
        delete updates.is_active;
      }
    }

    this.users = this.users.map((u) =>
      u.id === id ? { ...u, ...updates } : u,
    );
    setStorageItem("users", this.users);

    if (target) {
      logAudit(
        "usr-system",
        "Executive Admin",
        updates.is_active === false
          ? "user.deactivated"
          : updates.is_active === true
            ? "user.reactivated"
            : "user.invited",
        "User",
        id,
        `${target.name} (${target.email})`,
        updates,
      );
    }

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "users", id), updates).catch(console.error);
    }
    return this.users.find((u) => u.id === id);
  }

  deactivateUser(id: string): void {
    const target = this.users.find((u) => u.id === id);
    if (target && target.email.toLowerCase() === ROOT_MASTER_EMAIL) {
      console.warn("Root master account cannot be deactivated.");
      return;
    }
    this.updateUser(id, { is_active: false });
  }

  removeUser(id: string): void {
    const target = this.users.find((u) => u.id === id);
    if (target && target.email.toLowerCase() === ROOT_MASTER_EMAIL) {
      console.warn("Root master account cannot be removed.");
      return;
    }

    this.users = this.users.filter((u) => u.id !== id);
    setStorageItem("users", this.users);

    if (target) {
      logAudit(
        "usr-system",
        "Executive Admin",
        "user.removed",
        "User",
        id,
        `${target.name} (${target.email})`,
      );
    }

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "users", id)).catch(console.error);
    }
  }

  getRoles(): Role[] {
    return this.roles;
  }

  addRole(role: Omit<Role, "id" | "org_id">): Role {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}`,
      org_id: this.org.id,
    };
    this.roles = [...this.roles, newRole];
    setStorageItem("roles", this.roles);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "roles", newRole.id), newRole).catch(console.error);
    }

    logAudit(
      "usr-system",
      "Executive Admin",
      "role.created",
      "Role",
      newRole.id,
      newRole.name,
      { hierarchy_level: newRole.hierarchy_level },
    );

    return newRole;
  }

  // ── Services Catalog (Chief Admin) ───────────────────────────────────────────
  getServices(): HesicsService[] {
    return this.services;
  }

  addService(service: Omit<HesicsService, "id" | "created_at">): HesicsService {
    const newService: HesicsService = {
      ...service,
      id: `srv-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.services = [newService, ...this.services];
    setStorageItem("services", this.services);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "services", newService.id), newService).catch(
        console.error,
      );
    }

    logAudit(
      "usr-system",
      "Chief Admin",
      "service.created",
      "Service",
      newService.id,
      newService.name,
      { default_rate: newService.default_rate, category: newService.category },
    );

    return newService;
  }

  updateService(
    id: string,
    updates: Partial<HesicsService>,
  ): HesicsService | undefined {
    this.services = this.services.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    setStorageItem("services", this.services);
    const updated = this.services.find((s) => s.id === id);

    const firestore = dbInstance;
    if (firestore && updated) {
      updateDoc(doc(firestore, "services", id), updates).catch(console.error);
    }

    if (updated) {
      logAudit(
        "usr-system",
        "Chief Admin",
        "service.updated",
        "Service",
        id,
        updated.name,
        updates,
      );
    }

    return updated;
  }

  deleteService(id: string): void {
    const target = this.services.find((s) => s.id === id);
    this.services = this.services.filter((s) => s.id !== id);
    setStorageItem("services", this.services);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "services", id)).catch(console.error);
    }

    if (target) {
      logAudit(
        "usr-system",
        "Chief Admin",
        "service.deleted",
        "Service",
        id,
        target.name,
      );
    }
  }

  // ── Superadmin Private Vault ──────────────────────────────────────────────────
  getPrivateVaultItems(): PrivateVaultItem[] {
    return this.privateVaultItems;
  }

  addPrivateVaultItem(
    item: Omit<PrivateVaultItem, "id" | "created_at">,
  ): PrivateVaultItem {
    const newItem: PrivateVaultItem = {
      ...item,
      id: `pvt-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.privateVaultItems = [newItem, ...this.privateVaultItems];
    setStorageItem("private_vault", this.privateVaultItems);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "private_vault", newItem.id), newItem).catch(
        console.error,
      );
    }

    logAudit(
      "usr-superadmin",
      "Superadmin",
      "vault.created",
      "PrivateVault",
      newItem.id,
      newItem.title,
      { type: newItem.type, amount: newItem.amount },
    );

    return newItem;
  }

  updatePrivateVaultItem(
    id: string,
    updates: Partial<PrivateVaultItem>,
  ): PrivateVaultItem | undefined {
    this.privateVaultItems = this.privateVaultItems.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    );
    setStorageItem("private_vault", this.privateVaultItems);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "private_vault", id), updates).catch(
        console.error,
      );
    }
    return this.privateVaultItems.find((p) => p.id === id);
  }

  deletePrivateVaultItem(id: string): void {
    const target = this.privateVaultItems.find((p) => p.id === id);
    this.privateVaultItems = this.privateVaultItems.filter((p) => p.id !== id);
    setStorageItem("private_vault", this.privateVaultItems);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "private_vault", id)).catch(console.error);
    }

    if (target) {
      logAudit(
        "usr-superadmin",
        "Superadmin",
        "vault.deleted",
        "PrivateVault",
        id,
        target.title,
      );
    }
  }

  // ── Clients ──────────────────────────────────────────────────────────────────
  getClients(): Client[] {
    return this.clients;
  }

  getClientById(id: string): Client | undefined {
    return this.clients.find((c) => c.id === id);
  }

  findPotentialClientDuplicates(input: {
    name?: string;
    company_name?: string;
    email?: string;
    phone?: string;
    exclude_id?: string;
  }): Client[] {
    const normalize = (value?: string) => value?.trim().toLowerCase().replace(/\s+/g, " ");
    const email = normalize(input.email);
    const phone = normalize(input.phone)?.replace(/[^0-9+]/g, "");
    const name = normalize(input.name);
    const company = normalize(input.company_name);
    return this.clients.filter((client) => {
      if (client.id === input.exclude_id || client.status === "archived") return false;
      const sameEmail = Boolean(email && normalize(client.email) === email);
      const samePhone = Boolean(phone && normalize(client.phone)?.replace(/[^0-9+]/g, "") === phone);
      const sameIdentity = Boolean(
        name && company && normalize(client.name) === name && normalize(client.company_name) === company,
      );
      return sameEmail || samePhone || sameIdentity;
    });
  }

  archiveClient(id: string): Client | undefined {
    return this.updateClient(id, {
      status: "archived",
      archived_at: new Date().toISOString(),
    });
  }

  restoreClient(id: string): Client | undefined {
    return this.updateClient(id, {
      status: "active",
      archived_at: undefined,
    });
  }

  addClient(
    client: Omit<Client, "id" | "org_id" | "created_at" | "updated_at">,
  ): Client {
    const newClient: Client = {
      ...client,
      id: `client-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.clients = [newClient, ...this.clients];
    setStorageItem("clients", this.clients);
    this.notify();

    logAudit(
      client.owner_id || "usr-admin",
      client.owner_name || "Admin",
      "client.created",
      "Client",
      newClient.id,
      newClient.name,
      {
        company: newClient.company_name,
        primary_service: newClient.primary_service,
      },
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "clients", newClient.id), newClient)
        .then(() => this.markPersistenceSynced())
        .catch((error) => {
          console.error("Client persistence failed:", error);
          this.markPersistenceError(error);
        });
    }
    return newClient;
  }

  updateClient(id: string, updates: Partial<Client>): Client | undefined {
    this.clients = this.clients.map((c) =>
      c.id === id
        ? { ...c, ...updates, updated_at: new Date().toISOString() }
        : c,
    );
    setStorageItem("clients", this.clients);
    const updated = this.clients.find((c) => c.id === id);

    if (updated) {
      logAudit(
        updated.owner_id || "usr-admin",
        updated.owner_name || "Admin",
        "client.updated",
        "Client",
        id,
        updated.name,
        updates,
      );
    }

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "clients", id), updates)
        .then(() => this.markPersistenceSynced())
        .catch((error) => {
          console.error("Client update persistence failed:", error);
          this.markPersistenceError(error);
        });
    }
    return updated;
  }

  deleteClient(id: string): void {
    const target = this.clients.find((c) => c.id === id);
    this.clients = this.clients.filter((c) => c.id !== id);
    setStorageItem("clients", this.clients);

    if (target) {
      logAudit(
        "usr-admin",
        "Admin",
        "client.deleted",
        "Client",
        id,
        target.name,
      );
    }

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "clients", id))
        .then(() => this.markPersistenceSynced())
        .catch((error) => {
          console.error("Client archive persistence failed:", error);
          this.markPersistenceError(error);
        });
    }
  }

  // ── Deals ────────────────────────────────────────────────────────────────────
  getDeals(): Deal[] {
    return this.deals;
  }

  addDeal(
    deal: Omit<Deal, "id" | "org_id" | "created_at" | "updated_at">,
  ): Deal {
    const newDeal: Deal = {
      ...deal,
      id: `deal-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.deals = [newDeal, ...this.deals];
    setStorageItem("deals", this.deals);
    this.notify();

    logAudit(
      deal.owner_id || "usr-admin",
      deal.owner_name || "Admin",
      "deal.created",
      "Deal",
      newDeal.id,
      `${newDeal.title} (INR ${newDeal.value.toLocaleString("en-IN")})`,
      { stage: newDeal.stage, client: newDeal.client_name },
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "deals", newDeal.id), newDeal).catch(console.error);
    }
    return newDeal;
  }

  updateDeal(id: string, updates: Partial<Deal>): Deal | undefined {
    const prev = this.deals.find((d) => d.id === id);
    this.deals = this.deals.map((d) =>
      d.id === id
        ? { ...d, ...updates, updated_at: new Date().toISOString() }
        : d,
    );
    setStorageItem("deals", this.deals);
    const updated = this.deals.find((d) => d.id === id);

    if (updated) {
      const isStageChange =
        updates.stage && prev && updates.stage !== prev.stage;
      logAudit(
        updated.owner_id || "usr-admin",
        updated.owner_name || "Admin",
        isStageChange ? "deal.stage_changed" : "deal.updated",
        "Deal",
        id,
        updated.title,
        isStageChange
          ? { from_stage: prev.stage, to_stage: updates.stage }
          : updates,
      );
    }

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "deals", id), updates).catch(console.error);
    }
    return updated;
  }

  deleteDeal(id: string): void {
    const target = this.deals.find((d) => d.id === id);
    this.deals = this.deals.filter((d) => d.id !== id);
    setStorageItem("deals", this.deals);

    if (target) {
      logAudit("usr-admin", "Admin", "deal.deleted", "Deal", id, target.title);
    }

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "deals", id)).catch(console.error);
    }
  }

  // ── Activities ───────────────────────────────────────────────────────────────
  getActivities(clientId?: string): Activity[] {
    if (clientId) {
      return this.activities.filter((a) => a.client_id === clientId);
    }
    return this.activities;
  }

  addActivity(
    activity: Omit<Activity, "id" | "org_id" | "created_at">,
  ): Activity {
    const newActivity: Activity = {
      ...activity,
      id: `act-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.activities = [newActivity, ...this.activities];
    setStorageItem("activities", this.activities);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "activities", newActivity.id), newActivity).catch(
        console.error,
      );
    }
    return newActivity;
  }

  // ── Quotations ───────────────────────────────────────────────────────────────
  getQuotations(): Quotation[] {
    return this.quotations;
  }

  addQuotation(
    quote: Omit<Quotation, "id" | "org_id" | "created_at">,
  ): Quotation {
    const newQuote: Quotation = {
      ...quote,
      id: `quote-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.quotations = [newQuote, ...this.quotations];
    setStorageItem("quotations", this.quotations);
    this.notify();

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "quotations", newQuote.id), newQuote).catch(
        console.error,
      );
    }

    logAudit(
      "usr-admin",
      "Admin",
      "quotation.created",
      "Quotation",
      newQuote.id,
      `Quotation #${newQuote.quotation_number || newQuote.quote_number} (${newQuote.client_name})`,
      { total: newQuote.total, valid_until: newQuote.valid_until },
    );

    return newQuote;
  }

  updateQuotation(
    id: string,
    updates: Partial<Quotation>,
  ): Quotation | undefined {
    const prev = this.quotations.find((q) => q.id === id);
    this.quotations = this.quotations.map((q) =>
      q.id === id ? { ...q, ...updates } : q,
    );
    setStorageItem("quotations", this.quotations);

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "quotations", id), updates).catch(console.error);
    }
    const updated = this.quotations.find((q) => q.id === id);

    if (updated) {
      const isStatusChange =
        updates.status && prev && updates.status !== prev.status;
      logAudit(
        "usr-admin",
        "Admin",
        isStatusChange ? "quotation.status_changed" : "quotation.updated",
        "Quotation",
        id,
        `Quotation #${updated.quotation_number || updated.quote_number}`,
        isStatusChange
          ? { from_status: prev.status, to_status: updates.status }
          : updates,
      );
    }

    return updated;
  }

  deleteQuotation(id: string): void {
    const target = this.quotations.find((q) => q.id === id);
    this.quotations = this.quotations.filter((q) => q.id !== id);
    setStorageItem("quotations", this.quotations);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "quotations", id)).catch(console.error);
    }

    if (target) {
      logAudit(
        "usr-admin",
        "Admin",
        "quotation.deleted",
        "Quotation",
        id,
        `Quotation #${target.quotation_number || target.quote_number}`,
      );
    }
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────
  getInvoices(): Invoice[] {
    return this.invoices;
  }

  addInvoice(inv: Omit<Invoice, "id" | "org_id" | "created_at">): Invoice {
    const newInv: Invoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.invoices = [newInv, ...this.invoices];
    setStorageItem("invoices", this.invoices);
    this.notify();

    logAudit(
      "usr-admin",
      "Admin",
      "invoice.created",
      "Invoice",
      newInv.id,
      `Invoice #${newInv.invoice_number} (${newInv.client_name})`,
      { total: newInv.total, due_date: newInv.due_date, status: newInv.status },
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "invoices", newInv.id), newInv).catch(
        console.error,
      );
    }
    return newInv;
  }

  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const prev = this.invoices.find((i) => i.id === id);
    this.invoices = this.invoices.map((i) =>
      i.id === id ? { ...i, ...updates } : i,
    );
    setStorageItem("invoices", this.invoices);

    const updated = this.invoices.find((i) => i.id === id);
    if (updated) {
      const isStatusChange =
        updates.status && prev && updates.status !== prev.status;
      logAudit(
        "usr-admin",
        "Admin",
        isStatusChange ? "invoice.status_changed" : "invoice.updated",
        "Invoice",
        id,
        `Invoice #${updated.invoice_number}`,
        isStatusChange
          ? { from_status: prev.status, to_status: updates.status }
          : updates,
      );

      if (updates.status === "paid" && prev?.status !== "paid") {
        this.addIncomeEntry({
          source_type: "invoice",
          source_id: updated.id,
          client_name: updated.client_name,
          amount: updated.total,
          currency: "INR",
          category: "Client Services / Invoice",
          received_at: new Date().toISOString().split("T")[0],
          payment_method: "Direct Bank Transfer",
          notes: `Auto-recorded from paid Invoice #${updated.invoice_number}`,
        });
      }
    }

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "invoices", id), updates).catch(console.error);
    }
    return updated;
  }

  deleteInvoice(id: string): void {
    const target = this.invoices.find((i) => i.id === id);
    this.invoices = this.invoices.filter((i) => i.id !== id);
    setStorageItem("invoices", this.invoices);

    if (target) {
      logAudit(
        "usr-admin",
        "Admin",
        "invoice.deleted",
        "Invoice",
        id,
        `Invoice #${target.invoice_number}`,
      );
    }

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "invoices", id)).catch(console.error);
    }
  }

  // ── Finance (Income & Expenses) ──────────────────────────────────────────────
  getIncomeEntries(): IncomeEntry[] {
    return this.incomeEntries;
  }

  addIncomeEntry(
    entry: Omit<IncomeEntry, "id" | "org_id" | "created_at">,
  ): IncomeEntry {
    const newEntry: IncomeEntry = {
      ...entry,
      id: `inc-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.incomeEntries = [newEntry, ...this.incomeEntries];
    setStorageItem("income_entries", this.incomeEntries);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "income_entries", newEntry.id), newEntry).catch(
        console.error,
      );
    }

    logAudit(
      entry.created_by || "usr-admin",
      "Finance Operations",
      "income.created",
      "IncomeEntry",
      newEntry.id,
      `Inflow INR ${newEntry.amount.toLocaleString("en-IN")} (${newEntry.client_name || "Direct Revenue"})`,
      { category: newEntry.category, method: newEntry.payment_method },
    );

    return newEntry;
  }

  deleteIncomeEntry(id: string): void {
    const target = this.incomeEntries.find((i) => i.id === id);
    this.incomeEntries = this.incomeEntries.filter((i) => i.id !== id);
    setStorageItem("income_entries", this.incomeEntries);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "income_entries", id)).catch(console.error);
    }

    if (target) {
      logAudit(
        "usr-admin",
        "Finance Operations",
        "income.deleted",
        "IncomeEntry",
        id,
        `Inflow INR ${target.amount.toLocaleString("en-IN")}`,
      );
    }
  }

  getExpenseEntries(): ExpenseEntry[] {
    return this.expenseEntries;
  }

  addExpenseEntry(
    entry: Omit<ExpenseEntry, "id" | "org_id" | "created_at">,
  ): ExpenseEntry {
    const newEntry: ExpenseEntry = {
      ...entry,
      id: `exp-${Date.now()}`,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.expenseEntries = [newEntry, ...this.expenseEntries];
    setStorageItem("expense_entries", this.expenseEntries);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "expense_entries", newEntry.id), newEntry).catch(
        console.error,
      );
    }

    logAudit(
      entry.created_by || "usr-admin",
      "Finance Operations",
      "expense.created",
      "ExpenseEntry",
      newEntry.id,
      `Outflow INR ${newEntry.amount.toLocaleString("en-IN")} (${newEntry.vendor || newEntry.category})`,
      { category: newEntry.category, gst_paid: newEntry.gst_paid },
    );

    return newEntry;
  }

  deleteExpenseEntry(id: string): void {
    const target = this.expenseEntries.find((e) => e.id === id);
    this.expenseEntries = this.expenseEntries.filter((e) => e.id !== id);
    setStorageItem("expense_entries", this.expenseEntries);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "expense_entries", id)).catch(console.error);
    }

    if (target) {
      logAudit(
        "usr-admin",
        "Finance Operations",
        "expense.deleted",
        "ExpenseEntry",
        id,
        `Outflow INR ${target.amount.toLocaleString("en-IN")}`,
      );
    }
  }

  // ── Metrics & Aggregations ───────────────────────────────────────────────────
  getOrgStats() {
    const activeClients = this.clients.filter(
      (c) => c.status === "active",
    ).length;
    const totalClients = this.clients.length;

    const activePipelineValue = this.deals
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((sum, d) => sum + Number(d.value), 0);

    const totalInvoiced = this.invoices.reduce(
      (sum, i) => sum + Number(i.total || 0),
      0,
    );
    const cashCollected =
      this.invoices
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + Number(i.total || 0), 0) +
      this.incomeEntries.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

    const totalExpenses = this.expenseEntries.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    );
    const netProfit = cashCollected - totalExpenses;
    const profitMargin =
      cashCollected > 0 ? Math.round((netProfit / cashCollected) * 100) : 100;

    const now = Date.now();
    const overdueFollowUps = this.activities.filter(
      (a) =>
        a.due_date && !a.is_completed && new Date(a.due_date).getTime() < now,
    ).length;

    return {
      activeClients,
      totalClients,
      activePipelineValue,
      totalDeals: this.deals.length,
      totalInvoiced,
      cashCollected,
      totalExpenses,
      netProfit,
      profitMargin,
      overdueFollowUps,
    };
  }

  getOverdueActivitiesCount(): number {
    const now = Date.now();
    return this.activities.filter(
      (a) =>
        a.due_date && !a.is_completed && new Date(a.due_date).getTime() < now,
    ).length;
  }
  // ── Client Agreements ─────────────────────────────────────────────────────────
  getAgreements(): ClientAgreement[] {
    return this.agreements;
  }

  getAgreementsByClient(clientId: string): ClientAgreement[] {
    return this.agreements.filter((a) => a.client_id === clientId);
  }

  getAgreementById(id: string): ClientAgreement | undefined {
    return this.agreements.find((a) => a.id === id);
  }

  addAgreement(
    agreement: Omit<
      ClientAgreement,
      "id" | "org_id" | "created_at" | "sign_link"
    >,
  ): ClientAgreement {
    const id = `agr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newAgreement: ClientAgreement = {
      ...agreement,
      id,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
      sign_link: `${typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://hub-hesics.vercel.app"}#/sign-agreement/${id}`,
    };
    this.agreements = [newAgreement, ...this.agreements];
    setStorageItem("agreements", this.agreements);
    logAudit(
      "usr-admin",
      "Admin",
      "client.created",
      "Agreement",
      newAgreement.id,
      `Agreement for ${newAgreement.client_name}`,
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "agreements", newAgreement.id), newAgreement).catch(
        console.error,
      );
    }
    return newAgreement;
  }

  updateAgreement(
    id: string,
    updates: Partial<ClientAgreement>,
  ): ClientAgreement | undefined {
    this.agreements = this.agreements.map((a) =>
      a.id === id ? { ...a, ...updates } : a,
    );
    setStorageItem("agreements", this.agreements);
    this.notify();

    const firestore = dbInstance;
    if (firestore) {
      updateDoc(doc(firestore, "agreements", id), updates).catch(console.error);
    }
    return this.agreements.find((a) => a.id === id);
  }

  deleteAgreement(id: string): void {
    this.agreements = this.agreements.filter((a) => a.id !== id);
    setStorageItem("agreements", this.agreements);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "agreements", id)).catch(console.error);
    }
  }

  // ── Meetings & Consultations ──────────────────────────────────────────────────
  getMeetings(): MeetingItem[] {
    return this.meetings;
  }

  addMeeting(meeting: Omit<MeetingItem, "id" | "created_at">): MeetingItem {
    const id = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newMeeting: MeetingItem = {
      ...meeting,
      id,
      org_id: this.org.id,
      created_at: new Date().toISOString(),
    };
    this.meetings = [newMeeting, ...this.meetings];
    setStorageItem("meetings", this.meetings);
    logAudit(
      "usr-admin",
      "Admin",
      "client.updated",
      "Meeting",
      id,
      `Meeting: ${newMeeting.title}`,
    );

    const firestore = dbInstance;
    if (firestore) {
      setDoc(doc(firestore, "meetings", id), newMeeting).catch(console.error);
    }
    return newMeeting;
  }

  deleteMeeting(id: string): void {
    this.meetings = this.meetings.filter((m) => m.id !== id);
    setStorageItem("meetings", this.meetings);

    const firestore = dbInstance;
    if (firestore) {
      deleteDoc(doc(firestore, "meetings", id)).catch(console.error);
    }
  }

  // ── Notion Workspaces ────────────────────────────────────────────────────────
  getNotionWorkspace(scopeId: string): NotionWorkspaceDoc | undefined {
    return this.notionDocs[scopeId];
  }

  saveNotionWorkspace(docData: NotionWorkspaceDoc): void {
    this.notionDocs[docData.id] = {
      ...docData,
      updated_at: new Date().toISOString(),
    };
    setStorageItem("notion_docs", this.notionDocs);

    const firestore = dbInstance;
    if (firestore) {
      setDoc(
        doc(firestore, "notion_workspaces", docData.id),
        this.notionDocs[docData.id],
      ).catch(console.error);
    }
  }
}

export const db = new FirebaseDataStore();
