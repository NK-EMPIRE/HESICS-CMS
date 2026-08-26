import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Cloud,
  ExternalLink,
  File,
  FilePlus2,
  FolderOpen,
  Globe2,
  KanbanSquare,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  StickyNote,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebaseDb";
import { storage } from "../lib/firebase";
import {
  Client,
  DomainRecord,
  DomainStatus,
  ManagementFile,
  PrivateVaultItem,
  User,
} from "../lib/types";
import { isSuperadmin } from "../lib/rbac";
import { showToast } from "../components/common/Toast";
import { NotionWorkspace } from "../components/notion/NotionWorkspace";
import { createMiroStickyNote, isMiroEmbedded } from "../lib/miroBridge";

interface ManagementProps {
  activeUser: User;
}

type ManagementTab =
  | "overview"
  | "tasks"
  | "domains"
  | "files"
  | "clients"
  | "employees"
  | "collaboration";

type CollaborationView = "notion" | "board";

const tabs: Array<{ id: ManagementTab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "clients", label: "Clients", icon: Users },
  { id: "employees", label: "Employees", icon: ShieldCheck },
  { id: "collaboration", label: "Collaboration", icon: Network },
];

const domainStatuses: DomainStatus[] = ["active", "expiring", "expired", "parked"];

const statusStyle: Record<DomainStatus, string> = {
  active: "text-emerald-300 bg-emerald-950/40 border-emerald-900/50",
  expiring: "text-amber-300 bg-amber-950/40 border-amber-900/50",
  expired: "text-rose-300 bg-rose-950/40 border-rose-900/50",
  parked: "text-slate-300 bg-slate-900/50 border-slate-700/50",
};

const taskStatusStyle: Record<NonNullable<PrivateVaultItem["status"]>, string> = {
  backlog: "text-slate-300 bg-slate-900/50 border-slate-700/50",
  in_progress: "text-sky-300 bg-sky-950/40 border-sky-900/50",
  review: "text-amber-300 bg-amber-950/40 border-amber-900/50",
  done: "text-emerald-300 bg-emerald-950/40 border-emerald-900/50",
};

const priorityStyle: Record<NonNullable<PrivateVaultItem["priority"]>, string> = {
  low: "text-slate-400",
  medium: "text-sky-300",
  high: "text-amber-300",
  critical: "text-rose-300",
};

const fileSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const daysUntil = (date?: string) => {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`).getTime();
  return Math.ceil((target - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
};

const Pill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${className}`}>
    {children}
  </span>
);

const MetricCard: React.FC<{ label: string; value: string | number; detail: string; icon: React.ElementType; tone?: string }> = ({
  label,
  value,
  detail,
  icon: Icon,
  tone = "text-[#77727E]",
}) => (
  <div className="hesics-card p-4 sm:p-5 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.16em] text-[#686875] font-bold">{label}</span>
      <Icon className={`w-4 h-4 ${tone}`} />
    </div>
    <div className="text-2xl font-bold font-mono text-[#F4F4F6]">{value}</div>
    <div className="text-[10px] text-[#72727F]">{detail}</div>
  </div>
);

const EmptyState: React.FC<{ title: string; detail: string; icon: React.ElementType }> = ({ title, detail, icon: Icon }) => (
  <div className="rounded-2xl border border-dashed border-[#282832] bg-[#09090D] p-8 text-center">
    <Icon className="mx-auto mb-3 h-7 w-7 text-[#4C4C59]" />
    <div className="text-sm font-semibold text-[#D4D4D8]">{title}</div>
    <div className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#666674]">{detail}</div>
  </div>
);

export const Management: React.FC<ManagementProps> = ({ activeUser }) => {
  const navigate = useNavigate();
  const canAccess = isSuperadmin(activeUser.hierarchy) || activeUser.hierarchy === "founder";
  const [activeTab, setActiveTab] = useState<ManagementTab>("overview");
  const [collaborationView, setCollaborationView] = useState<CollaborationView>("notion");
  const [search, setSearch] = useState("");
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);

  const clients = db.getClients();
  const users = db.getUsers(activeUser.email);
  const tasks = db.getPrivateVaultItems().filter((item) => item.type === "task");
  const notes = db.getPrivateVaultItems().filter((item) => item.type === "note");
  const domains = db.getDomains();
  const files = db.getManagementFiles();
  const meetings = db.getMeetings();

  useEffect(() => db.subscribe(refresh), []);

  const filteredClients = clients.filter((client) => {
    const query = search.trim().toLowerCase();
    return !query || [client.name, client.company_name, client.email, client.industry].filter(Boolean).some((value) => value!.toLowerCase().includes(query));
  });

  const filteredFiles = files.filter((file) => {
    const query = search.trim().toLowerCase();
    return !query || [file.name, file.category, file.uploaded_by_name].filter(Boolean).some((value) => value!.toLowerCase().includes(query));
  });

  const completedTasks = tasks.filter((task) => task.status === "done" || task.is_completed).length;
  const overdueTasks = tasks.filter((task) => Boolean(task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date() && task.status !== "done" && !task.is_completed)).length;
  const upcomingMeetings = meetings.filter((meeting) => meeting.status === "upcoming").length;
  const expiringDomains = domains.filter((domain) => {
    const days = daysUntil(domain.renewal_date);
    return days !== null && days >= 0 && days <= 45;
  }).length;

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <Lock className="mx-auto mb-4 h-10 w-10 text-amber-300" />
        <h1 className="text-xl font-bold text-[#F4F4F6]">Superadmin Management Only</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#777783]">This command center contains executive work, domains, files, and private performance information. Your role does not have access.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 border-b border-[#1A1A20] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Pill className="border-amber-800/50 bg-amber-950/30 text-amber-300"><Lock className="mr-1 h-3 w-3" /> Superadmin</Pill>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#565661]">Management Command Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F6] font-display">Everything under management</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#858591]">A single executive workspace for the operating system: work, people, clients, domains, files, and collaborative thinking.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#686875]">
          <Activity className="h-3.5 w-3.5 text-emerald-400" /> Live workspace sync enabled
          <button type="button" onClick={refresh} className="ml-2 rounded-lg border border-[#272732] p-2 text-[#8B8B98] hover:border-[#77727E]/60 hover:text-white" title="Refresh management data"><RefreshCw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#1C1C24] bg-[#08080B] p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-semibold transition-colors sm:px-4 ${activeTab === id ? "bg-[#77727E] text-white shadow-lg" : "text-[#777783] hover:bg-[#15151C] hover:text-[#D4D4D8]"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {(activeTab === "overview" || activeTab === "clients" || activeTab === "files") && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555562]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="hesics-input pl-10" placeholder={activeTab === "files" ? "Search files by name or category..." : "Search clients, files, or work..."} />
          </div>
          <div className="text-[10px] text-[#686875]">Signed in as <span className="text-[#D4D4D8]">{activeUser.name}</span></div>
        </div>
      )}

      {activeTab === "overview" && (
        <Overview clients={filteredClients} users={users} tasks={tasks} domains={domains} files={filteredFiles} overdueTasks={overdueTasks} expiringDomains={expiringDomains} upcomingMeetings={upcomingMeetings} completedTasks={completedTasks} onNavigate={setActiveTab} navigate={navigate} />
      )}
      {activeTab === "tasks" && <TasksPanel tasks={tasks} users={users} activeUser={activeUser} onRefresh={refresh} />}
      {activeTab === "domains" && <DomainsPanel domains={domains} onRefresh={refresh} />}
      {activeTab === "files" && <FilesPanel files={filteredFiles} activeUser={activeUser} onRefresh={refresh} />}
      {activeTab === "clients" && <ClientsPanel clients={filteredClients} navigate={navigate} />}
      {activeTab === "employees" && <EmployeesPanel users={users} tasks={tasks} meetings={meetings} />}
      {activeTab === "collaboration" && (
        <CollaborationPanel view={collaborationView} setView={setCollaborationView} activeUser={activeUser} tasks={tasks} notes={notes} onRefresh={refresh} />
      )}
    </div>
  );
};

const Overview: React.FC<{
  clients: Client[];
  users: User[];
  tasks: PrivateVaultItem[];
  domains: DomainRecord[];
  files: ManagementFile[];
  overdueTasks: number;
  expiringDomains: number;
  upcomingMeetings: number;
  completedTasks: number;
  onNavigate: (tab: ManagementTab) => void;
  navigate: (path: string) => void;
}> = ({ clients, users, tasks, domains, files, overdueTasks, expiringDomains, upcomingMeetings, completedTasks, onNavigate, navigate }) => {
  const activeClients = clients.filter((client) => client.status === "active").length;
  const completionRate = tasks.length ? `${Math.round((completedTasks / tasks.length) * 100)}%` : "—";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard label="Active Clients" value={activeClients} detail={`${clients.length} total visible`} icon={Users} />
        <MetricCard label="Open Tasks" value={tasks.length - completedTasks} detail={`${overdueTasks} overdue`} icon={ClipboardList} tone={overdueTasks ? "text-rose-300" : "text-sky-300"} />
        <MetricCard label="Task Completion" value={completionRate} detail={`${completedTasks} completed`} icon={BarChart3} tone="text-emerald-300" />
        <MetricCard label="Domains" value={domains.length} detail={`${expiringDomains} renewal watch`} icon={Globe2} tone="text-amber-300" />
        <MetricCard label="Team" value={users.filter((user) => user.is_active).length} detail={`${files.length} managed files`} icon={ShieldCheck} tone="text-indigo-300" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section className="hesics-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1C1C24] px-5 py-4">
            <div><h2 className="text-sm font-bold text-[#F4F4F6]">Executive focus</h2><p className="mt-1 text-[10px] text-[#6E6E7B]">The items that deserve a decision next.</p></div>
            <button type="button" onClick={() => onNavigate("tasks")} className="text-[10px] font-semibold text-[#A7A3AD] hover:text-white">Open tasks <ChevronRight className="ml-1 inline h-3 w-3" /></button>
          </div>
          <div className="divide-y divide-[#17171E]">
            {tasks.filter((task) => task.status !== "done" && !task.is_completed).slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0"><div className="truncate text-xs font-semibold text-[#D4D4D8]">{task.title}</div><div className="mt-1 flex items-center gap-3 text-[10px] text-[#686875]"><span>{task.owner_name || "Unassigned"}</span>{task.due_date && <span>Due {task.due_date}</span>}</div></div>
                <Pill className={taskStatusStyle[task.status || "backlog"]}>{(task.status || "backlog").replace("_", " ")}</Pill>
              </div>
            ))}
            {!tasks.filter((task) => task.status !== "done" && !task.is_completed).length && <EmptyState title="No open executive tasks" detail="Create a task and assign it to keep the operating cadence visible." icon={CheckCircle2} />}
          </div>
        </section>

        <section className="space-y-3">
          <button type="button" onClick={() => onNavigate("domains")} className="hesics-card group flex w-full items-center justify-between p-5 text-left hover:border-[#77727E]/50"><div className="flex items-center gap-3"><div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-2.5"><Globe2 className="h-4 w-4 text-amber-300" /></div><div><div className="text-xs font-bold text-[#F4F4F6]">Domain watch</div><div className="mt-1 text-[10px] text-[#73737F]">{expiringDomains} renewal items require attention</div></div></div><ArrowUpRight className="h-4 w-4 text-[#5E5E6A] group-hover:text-white" /></button>
          <button type="button" onClick={() => onNavigate("employees")} className="hesics-card group flex w-full items-center justify-between p-5 text-left hover:border-[#77727E]/50"><div className="flex items-center gap-3"><div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-2.5"><Users className="h-4 w-4 text-indigo-300" /></div><div><div className="text-xs font-bold text-[#F4F4F6]">People operations</div><div className="mt-1 text-[10px] text-[#73737F]">Private work summaries and scorecards</div></div></div><ArrowUpRight className="h-4 w-4 text-[#5E5E6A] group-hover:text-white" /></button>
          <button type="button" onClick={() => onNavigate("collaboration")} className="hesics-card group flex w-full items-center justify-between p-5 text-left hover:border-[#77727E]/50"><div className="flex items-center gap-3"><div className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-2.5"><Network className="h-4 w-4 text-sky-300" /></div><div><div className="text-xs font-bold text-[#F4F4F6]">Collaboration room</div><div className="mt-1 text-[10px] text-[#73737F]">Notion-style records and Miro-style visual board</div></div></div><ArrowUpRight className="h-4 w-4 text-[#5E5E6A] group-hover:text-white" /></button>
          <div className="rounded-2xl border border-[#25252E] bg-[#0A0A0E] p-4 text-[10px] leading-relaxed text-[#6D6D79]"><Calendar className="mr-1.5 inline h-3.5 w-3.5 text-[#77727E]" /> {upcomingMeetings} upcoming meetings are visible from the shared calendar.</div>
          <button type="button" onClick={() => navigate("/clients")} className="w-full text-right text-[10px] font-semibold text-[#8B8792] hover:text-white">Open full Clients workspace <ExternalLink className="ml-1 inline h-3 w-3" /></button>
        </section>
      </div>
    </div>
  );
};

const TasksPanel: React.FC<{ tasks: PrivateVaultItem[]; users: User[]; activeUser: User; onRefresh: () => void }> = ({ tasks, users, activeUser, onRefresh }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ownerId, setOwnerId] = useState(activeUser.id);
  const [priority, setPriority] = useState<NonNullable<PrivateVaultItem["priority"]>>("medium");
  const [dueDate, setDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NonNullable<PrivateVaultItem["status"]>>("all");

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const owner = users.find((user) => user.id === ownerId) || activeUser;
    db.addPrivateVaultItem({ type: "task", title: cleanTitle, content: content.trim() || undefined, owner_id: owner.id, owner_name: owner.name, priority, status: "backlog", due_date: dueDate || undefined, is_completed: false });
    setTitle(""); setContent(""); setDueDate("");
    showToast("Task created", `Assigned to ${owner.name}.`, "success");
    onRefresh();
  };

  const updateStatus = (task: PrivateVaultItem, status: NonNullable<PrivateVaultItem["status"]>) => {
    db.updatePrivateVaultItem(task.id, { status, is_completed: status === "done" });
    onRefresh();
  };

  const visibleTasks = statusFilter === "all" ? tasks : tasks.filter((task) => (task.status || (task.is_completed ? "done" : "backlog")) === statusFilter);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
      <form onSubmit={addTask} className="hesics-card h-fit space-y-4 p-5">
        <div><h2 className="text-sm font-bold text-[#F4F4F6]">Create a managed task</h2><p className="mt-1 text-[10px] leading-relaxed text-[#6E6E7B]">Assign work once, then track it from the command center.</p></div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} required className="hesics-input" placeholder="Task title" />
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} className="hesics-input resize-none" placeholder="Context, outcome, or acceptance notes" />
        <div className="grid grid-cols-2 gap-2"><select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="hesics-input"><option value="">Unassigned</option>{users.filter((user) => user.is_active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="hesics-input">{["low", "medium", "high", "critical"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="hesics-input" />
        <button type="submit" className="hesics-btn-primary w-full"><Plus className="h-3.5 w-3.5" /> Add task</button>
      </form>
      <section className="hesics-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1C1C24] px-5 py-4"><div><h2 className="text-sm font-bold text-[#F4F4F6]">Work queue</h2><p className="mt-1 text-[10px] text-[#6E6E7B]">Private task assignments and progress.</p></div><div className="flex gap-1 rounded-xl border border-[#24242D] bg-[#08080B] p-1">{(["all", "backlog", "in_progress", "review", "done"] as const).map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-lg px-2.5 py-1 text-[9px] capitalize ${statusFilter === status ? "bg-[#77727E] text-white" : "text-[#777783] hover:text-white"}`}>{status.replace("_", " ")}</button>)}</div></div>
        <div className="divide-y divide-[#17171E]">{visibleTasks.map((task) => { const taskStatus = task.status || (task.is_completed ? "done" : "backlog"); return <div key={task.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${taskStatus === "done" ? "bg-emerald-400" : "bg-amber-300"}`} /><span className="truncate text-xs font-semibold text-[#D4D4D8]">{task.title}</span><span className={`text-[9px] font-bold uppercase ${priorityStyle[task.priority || "medium"]}`}>{task.priority || "medium"}</span></div><div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-[#686875]"><span>{task.owner_name || "Unassigned"}</span>{task.due_date && <span>Due {task.due_date}</span>}{task.content && <span className="max-w-[360px] truncate">{task.content}</span>}</div></div><select value={taskStatus} onChange={(event) => updateStatus(task, event.target.value as NonNullable<PrivateVaultItem["status"]>)} className={`rounded-lg border px-2 py-1 text-[9px] font-semibold uppercase ${taskStatusStyle[taskStatus]}`}><option value="backlog">Backlog</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="done">Done</option></select></div>; })}{!visibleTasks.length && <EmptyState title="No tasks in this view" detail="Create a task to start the operational queue." icon={ClipboardList} />}</div>
      </section>
    </div>
  );
};

const DomainsPanel: React.FC<{ domains: DomainRecord[]; onRefresh: () => void }> = ({ domains, onRefresh }) => {
  const [name, setName] = useState("");
  const [registrar, setRegistrar] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const addDomain = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) return;
    db.addDomain({ name: cleanName, registrar: registrar.trim() || undefined, renewal_date: renewalDate || undefined, purpose: purpose.trim() || undefined, auto_renew: autoRenew, status: (daysUntil(renewalDate) !== null && (daysUntil(renewalDate) as number) <= 45) ? "expiring" : "active" });
    setName(""); setRegistrar(""); setRenewalDate(""); setPurpose("");
    showToast("Domain added", `${cleanName} is now in the management register.`, "success");
    onRefresh();
  };
  const removeDomain = (domain: DomainRecord) => { if (window.confirm(`Remove ${domain.name} from the domain register?`)) { db.deleteDomain(domain.id); onRefresh(); } };
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
      <form onSubmit={addDomain} className="hesics-card h-fit space-y-4 p-5"><div><h2 className="text-sm font-bold text-[#F4F4F6]">Register a domain</h2><p className="mt-1 text-[10px] leading-relaxed text-[#6E6E7B]">Track renewal ownership and business purpose without storing registrar passwords here.</p></div><input value={name} onChange={(event) => setName(event.target.value)} required className="hesics-input" placeholder="hesics.com" /><input value={registrar} onChange={(event) => setRegistrar(event.target.value)} className="hesics-input" placeholder="Registrar" /><input type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} className="hesics-input" /><input value={purpose} onChange={(event) => setPurpose(event.target.value)} className="hesics-input" placeholder="Purpose / product" /><label className="flex items-center gap-2 text-xs text-[#A2A2AE]"><input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="accent-[#77727E]" /> Auto-renew enabled</label><button type="submit" className="hesics-btn-primary w-full"><Plus className="h-3.5 w-3.5" /> Add domain</button></form>
      <section className="hesics-card overflow-hidden"><div className="border-b border-[#1C1C24] px-5 py-4"><h2 className="text-sm font-bold text-[#F4F4F6]">Domain register</h2><p className="mt-1 text-[10px] text-[#6E6E7B]">Renewal visibility for company infrastructure.</p></div><div className="divide-y divide-[#17171E]">{domains.map((domain) => { const days = daysUntil(domain.renewal_date); const derivedStatus: DomainStatus = days !== null && days < 0 ? "expired" : days !== null && days <= 45 ? "expiring" : domain.status; return <div key={domain.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl border border-[#272732] bg-[#0A0A0E] p-2"><Globe2 className="h-4 w-4 text-[#77727E]" /></div><div className="min-w-0"><div className="truncate text-xs font-semibold text-[#D4D4D8]">{domain.name}</div><div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[#686875]"><span>{domain.registrar || "Registrar not set"}</span>{domain.renewal_date && <span>Renewal {domain.renewal_date}</span>}{domain.purpose && <span>{domain.purpose}</span>}</div></div></div><div className="flex items-center gap-3"><Pill className={statusStyle[derivedStatus]}>{derivedStatus}</Pill><span className="text-[10px] text-[#686875]">{days === null ? "No date" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</span><button type="button" onClick={() => removeDomain(domain)} className="rounded-lg p-1.5 text-[#5E5E6A] hover:bg-rose-950/30 hover:text-rose-300" title="Remove domain"><Trash2 className="h-3.5 w-3.5" /></button></div></div>; })}{!domains.length && <EmptyState title="No domains registered" detail="Add your company domains to create a renewal watch list." icon={Globe2} />}</div></section>
    </div>
  );
};

const FilesPanel: React.FC<{ files: ManagementFile[]; activeUser: User; onRefresh: () => void }> = ({ files, activeUser, onRefresh }) => {
  const [category, setCategory] = useState<ManagementFile["category"]>("operations");
  const [uploading, setUploading] = useState(false);
  const inputId = "management-file-upload";

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!storage) { showToast("Storage unavailable", "Configure Firebase Storage before uploading files.", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("File too large", "Files must be smaller than 10 MB.", "error"); return; }
    const allowed = /^(application\/pdf|image\/.*|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.)/;
    if (file.type && !allowed.test(file.type)) { showToast("File type blocked", "Upload a PDF, image, text, Word, or Office Open XML file.", "error"); return; }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160);
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `orgs/${db.getOrg().id}/management/${id}-${safeName}`;
      const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type || "application/octet-stream" });
      const downloadUrl = await getDownloadURL(uploaded.ref);
      db.addManagementFile({ name: file.name, category, storage_path: path, download_url: downloadUrl, content_type: file.type || undefined, size_bytes: file.size, uploaded_by: activeUser.id, uploaded_by_name: activeUser.name });
      showToast("File uploaded", `${file.name} is available in the management library.`, "success");
      onRefresh();
    } catch (error) {
      console.error("Management file upload failed", error);
      showToast("Upload failed", "The file was not stored. Check Firebase Storage rules and try again.", "error");
    } finally { setUploading(false); }
  };

  const removeFile = async (file: ManagementFile) => {
    if (!window.confirm(`Delete ${file.name} from management files?`)) return;
    try { if (storage && file.storage_path) await deleteObject(ref(storage, file.storage_path)); } catch (error) { console.warn("Storage object delete failed", error); }
    db.deleteManagementFile(file.id);
    onRefresh();
  };

  return (
    <div className="space-y-5"><div className="flex flex-col gap-3 rounded-2xl border border-[#24242D] bg-[#0A0A0E] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-2.5"><Cloud className="h-4 w-4 text-sky-300" /></div><div><div className="text-xs font-bold text-[#F4F4F6]">Secure management library</div><div className="mt-1 text-[10px] text-[#6E6E7B]">Organization-scoped storage with a 10 MB upload limit.</div></div></div><div className="flex items-center gap-2"><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="hesics-input w-auto text-xs">{["contract", "finance", "brand", "operations", "other"].map((value) => <option key={value} value={value}>{value}</option>)}</select><label htmlFor={inputId} className={`hesics-btn-primary cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}><Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload file"}</label><input id={inputId} type="file" onChange={uploadFile} className="hidden" /></div></div><section className="hesics-card overflow-hidden"><div className="border-b border-[#1C1C24] px-5 py-4"><h2 className="text-sm font-bold text-[#F4F4F6]">File library</h2><p className="mt-1 text-[10px] text-[#6E6E7B]">Contracts, finance, brand assets, and operating documents.</p></div><div className="divide-y divide-[#17171E]">{files.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl border border-[#272732] bg-[#0A0A0E] p-2"><File className="h-4 w-4 text-[#77727E]" /></div><div className="min-w-0"><div className="truncate text-xs font-semibold text-[#D4D4D8]">{file.name}</div><div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[#686875]"><span className="capitalize">{file.category}</span><span>{fileSize(file.size_bytes)}</span><span>{file.uploaded_by_name || "Unknown uploader"}</span></div></div></div><div className="flex items-center gap-1.5">{file.download_url && <a href={file.download_url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-[#707080] hover:bg-[#1A1A24] hover:text-white" title="Open file"><ExternalLink className="h-3.5 w-3.5" /></a>}<button type="button" onClick={() => removeFile(file)} className="rounded-lg p-1.5 text-[#5E5E6A] hover:bg-rose-950/30 hover:text-rose-300" title="Delete file"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}{!files.length && <EmptyState title="No managed files" detail="Upload a document to create an organization-scoped file register." icon={FolderOpen} />}</div></section></div>
  );
};

const ClientsPanel: React.FC<{ clients: Client[]; navigate: (path: string) => void }> = ({ clients, navigate }) => (
  <section className="hesics-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#1C1C24] px-5 py-4"><div><h2 className="text-sm font-bold text-[#F4F4F6]">Client management</h2><p className="mt-1 text-[10px] text-[#6E6E7B]">High-level portfolio view; detailed commercial actions remain in Clients.</p></div><button type="button" onClick={() => navigate("/clients")} className="hesics-btn-secondary text-[10px]">Open Clients <ArrowUpRight className="h-3.5 w-3.5" /></button></div><div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{clients.map((client) => <button key={client.id} type="button" onClick={() => navigate(`/clients/${client.id}`)} className="rounded-2xl border border-[#24242D] bg-[#0A0A0E] p-4 text-left transition-colors hover:border-[#77727E]/60"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#D4D4D8]">{client.name}</div><div className="mt-1 truncate text-[10px] text-[#686875]">{client.company_name || client.email || "No company details"}</div></div><Pill className={client.status === "active" ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-300" : "border-[#353540] bg-[#15151C] text-[#A0A0AC]"}>{client.status.replace("_", " ")}</Pill></div><div className="mt-4 flex items-center justify-between text-[10px] text-[#686875]"><span>{client.owner_name || "Unassigned"}</span><span>{client.next_action_due ? `Due ${client.next_action_due}` : "No next action"}</span></div></button>)}{!clients.length && <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No matching clients" detail="Adjust the search or open the full Clients workspace." icon={Users} /></div>}</div></section>
);

const EmployeesPanel: React.FC<{ users: User[]; tasks: PrivateVaultItem[]; meetings: ReturnType<typeof db.getMeetings> }> = ({ users, tasks, meetings }) => {
  const scoreFor = (user: User) => { const owned = tasks.filter((task) => task.owner_id === user.id); const completed = owned.filter((task) => task.status === "done" || task.is_completed).length; return owned.length ? Math.round((completed / owned.length) * 100) : 0; };
  return <div className="space-y-5"><div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-4 text-xs leading-relaxed text-amber-100/70"><Lock className="mr-2 inline h-3.5 w-3.5 text-amber-300" />Employee and intern scores, work summaries, and meeting activity are visible only in this Superadmin workspace.</div><section className="hesics-card overflow-hidden"><div className="border-b border-[#1C1C24] px-5 py-4"><h2 className="text-sm font-bold text-[#F4F4F6]">People operations</h2><p className="mt-1 text-[10px] text-[#6E6E7B]">Private operational scorecards based on managed work.</p></div><div className="divide-y divide-[#17171E]">{users.filter((user) => user.is_active).map((user) => { const owned = tasks.filter((task) => task.owner_id === user.id); const completed = owned.filter((task) => task.status === "done" || task.is_completed).length; const score = scoreFor(user); const userMeetings = meetings.filter((meeting) => meeting.host_email === user.email).length; return <div key={user.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2B2B36] bg-[#14141C] text-xs font-bold text-[#B0ADB6]">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><div className="text-xs font-bold text-[#D4D4D8]">{user.name}</div><div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[#686875]"><span>{user.hierarchy}</span><span>{user.department || "General"}</span><span>{userMeetings} meetings</span></div></div></div><div className="grid grid-cols-3 gap-5 text-right"><div><div className="text-lg font-bold font-mono text-[#F4F4F6]">{owned.length}</div><div className="text-[9px] uppercase tracking-wider text-[#60606C]">Tasks</div></div><div><div className="text-lg font-bold font-mono text-emerald-300">{completed}</div><div className="text-[9px] uppercase tracking-wider text-[#60606C]">Done</div></div><div><div className={`text-lg font-bold font-mono ${score >= 70 ? "text-emerald-300" : score >= 40 ? "text-amber-300" : "text-[#F4F4F6]"}`}>{owned.length ? `${score}%` : "—"}</div><div className="text-[9px] uppercase tracking-wider text-[#60606C]">Score</div></div></div></div>; })}{!users.filter((user) => user.is_active).length && <EmptyState title="No active team members" detail="Invite employees or interns from Team & RBAC." icon={Users} />}</div></section></div>;
};

const CollaborationPanel: React.FC<{ view: CollaborationView; setView: (view: CollaborationView) => void; activeUser: User; tasks: PrivateVaultItem[]; notes: PrivateVaultItem[]; onRefresh: () => void }> = ({ view, setView, activeUser, tasks, notes, onRefresh }) => (
  <div className="space-y-4"><div className="flex flex-col gap-3 rounded-2xl border border-[#24242D] bg-[#0A0A0E] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-[#F4F4F6]">Superadmin collaboration room</h2><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#6E6E7B]">Notion-style structured knowledge and a Miro-style visual canvas, both connected to the HESICS organization workspace.</p></div><div className="flex gap-1 rounded-xl border border-[#24242D] bg-[#08080B] p-1"><button type="button" onClick={() => setView("notion")} className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${view === "notion" ? "bg-[#77727E] text-white" : "text-[#777783]"}`}><StickyNote className="mr-1 inline h-3 w-3" /> Notion room</button><button type="button" onClick={() => setView("board")} className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${view === "board" ? "bg-[#77727E] text-white" : "text-[#777783]"}`}><KanbanSquare className="mr-1 inline h-3 w-3" /> Visual board</button></div></div>{view === "notion" ? <NotionWorkspace scopeId="org-management" scopeTitle="Superadmin Management" activeUser={activeUser} /> : <VisualBoard tasks={tasks} notes={notes} onRefresh={onRefresh} />}</div>
);

const VisualBoard: React.FC<{ tasks: PrivateVaultItem[]; notes: PrivateVaultItem[]; onRefresh: () => void }> = ({ tasks, notes, onRefresh }) => {
  const [newNote, setNewNote] = useState("");
  const miroAvailable = isMiroEmbedded();
  const boardItems = [...tasks, ...notes].slice(0, 30);
  const addNote = (event: React.FormEvent) => { event.preventDefault(); if (!newNote.trim()) return; db.addPrivateVaultItem({ type: "note", title: newNote.trim().slice(0, 80), content: newNote.trim(), board_x: 32 + (boardItems.length % 4) * 210, board_y: 32 + Math.floor(boardItems.length / 4) * 150, board_color: (["amber", "blue", "green", "pink"] as const)[boardItems.length % 4] }); setNewNote(""); showToast("Sticky note added", "The visual board was updated.", "success"); onRefresh(); };
  const sendToMiro = async () => {
    const item = boardItems[0];
    if (!item) {
      showToast("Nothing to send", "Add a sticky note or task first.", "info");
      return;
    }
    if (!miroAvailable) {
      showToast("Native board active", "The Miro Web SDK runs inside an authorized Miro board. This HESICS canvas remains available here.", "info");
      return;
    }
    try {
      await createMiroStickyNote(item.content || item.title, { x: item.board_x || 0, y: item.board_y || 0 });
      showToast("Sent to Miro", "The first visible board item was created in the connected Miro board.", "success");
    } catch (error) {
      console.error("Miro board bridge failed", error);
      showToast("Miro connection failed", "Authorize the HESICS app inside a Miro board and try again.", "error");
    }
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain"); const rect = event.currentTarget.getBoundingClientRect(); const x = Math.max(12, event.clientX - rect.left - 80); const y = Math.max(12, event.clientY - rect.top - 40); if (id) { db.updatePrivateVaultItem(id, { board_x: x, board_y: y }); onRefresh(); } };
  const colorClass: Record<NonNullable<PrivateVaultItem["board_color"]>, string> = { amber: "border-amber-700/50 bg-amber-950/40", blue: "border-sky-700/50 bg-sky-950/40", green: "border-emerald-700/50 bg-emerald-950/40", pink: "border-fuchsia-700/50 bg-fuchsia-950/40" };
  return <div className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><form onSubmit={addNote} className="flex flex-1 gap-2"><input value={newNote} onChange={(event) => setNewNote(event.target.value)} className="hesics-input flex-1" placeholder="Add a sticky note to the visual board..." /><button type="submit" className="hesics-btn-primary"><Plus className="h-3.5 w-3.5" /> Add sticky note</button></form><button type="button" onClick={sendToMiro} className="hesics-btn-secondary"><Network className="h-3.5 w-3.5" /> {miroAvailable ? "Send to Miro" : "Miro bridge"}</button></div><div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="relative min-h-[580px] overflow-hidden rounded-3xl border border-[#2A2A34] bg-[#08080B]" style={{ backgroundImage: "radial-gradient(#25252F 1px, transparent 1px)", backgroundSize: "22px 22px" }}><div className="absolute left-4 top-4 z-10 rounded-lg border border-[#292934] bg-[#0B0B10]/90 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[#696975]">Drag cards to arrange · private command canvas</div>{boardItems.map((item, index) => { const color = item.board_color || (["amber", "blue", "green", "pink"] as const)[index % 4]; return <div key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} className={`absolute w-44 cursor-grab rounded-2xl border p-3 shadow-xl transition-shadow hover:shadow-2xl active:cursor-grabbing ${colorClass[color]}`} style={{ left: item.board_x ?? 32 + (index % 4) * 210, top: item.board_y ?? 80 + Math.floor(index / 4) * 150 }}><div className="mb-2 flex items-center justify-between gap-2"><Pill className="border-white/10 bg-black/10 text-white/70">{item.type}</Pill><MoreHorizontal className="h-3.5 w-3.5 text-white/50" /></div><div className="line-clamp-3 text-xs font-bold leading-relaxed text-white/90">{item.title}</div>{item.content && <div className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-white/60">{item.content}</div>}{item.owner_name && <div className="mt-3 text-[9px] text-white/50">{item.owner_name}</div>}</div>; })}{!boardItems.length && <div className="absolute inset-0 flex items-center justify-center"><EmptyState title="Your visual board is ready" detail="Add a sticky note or create a task to begin arranging the executive canvas." icon={KanbanSquare} /></div>}</div></div>;
};
