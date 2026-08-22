import { DatePicker } from "../common/DatePicker";
import React, { useState, useEffect } from "react";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Columns,
  Rows,
  Tag,
  Hash,
  Calendar,
  CheckSquare,
  Sparkles,
  Save,
  Search,
  Download,
  FileSpreadsheet,
  BookOpen,
  Heading1,
  Heading2,
  Quote,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { db } from "../../lib/firebaseDb";
import { User } from "../../lib/types";
import { showToast } from "../common/Toast";

export type ColumnType =
  "text" | "number" | "select" | "status" | "date" | "checkbox";

export interface NotionColumn {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
}

export interface NotionRow {
  id: string;
  cells: Record<string, any>;
  created_at: string;
}

export interface NotionWorkspaceProps {
  scopeId: string; // e.g. "client-cl-123" or "org-global"
  scopeTitle?: string;
  activeUser: User;
}

const STORAGE_PREFIX = "hesics_notion_";

export const NotionWorkspace: React.FC<NotionWorkspaceProps> = ({
  scopeId,
  scopeTitle = "Collaborative Workspace",
  activeUser,
}) => {
  const storageKey = `${STORAGE_PREFIX}${scopeId}`;

  const [activeSubTab, setActiveSubTab] = useState<"table" | "notes">("table");

  const existingDoc = db.getNotionWorkspace(scopeId);

  // 1. Dynamic Table State
  const [columns, setColumns] = useState<NotionColumn[]>(() => {
    if (existingDoc?.columns?.length) return existingDoc.columns;
    try {
      const saved = localStorage.getItem(`${storageKey}_cols`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "col-task", name: "Deliverable / Item", type: "text" },
      {
        id: "col-status",
        name: "Status",
        type: "status",
        options: ["Not Started", "In Progress", "In Review", "Completed"],
      },
      { id: "col-owner", name: "Assignee", type: "text" },
      {
        id: "col-priority",
        name: "Priority",
        type: "select",
        options: ["P0 - Critical", "P1 - High", "P2 - Normal"],
      },
      { id: "col-due", name: "Target Date", type: "date" },
      { id: "col-done", name: "Verified", type: "checkbox" },
    ];
  });

  const [rows, setRows] = useState<NotionRow[]>(() => {
    if (existingDoc?.rows?.length) return existingDoc.rows;
    try {
      const saved = localStorage.getItem(`${storageKey}_rows`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "row-1",
        cells: {
          "col-task": "Cloud Infrastructure & High-Availability Setup",
          "col-status": "Completed",
          "col-owner": "Naveen Karthick",
          "col-priority": "P0 - Critical",
          "col-due": "2026-08-25",
          "col-done": true,
        },
        created_at: new Date().toISOString(),
      },
      {
        id: "row-2",
        cells: {
          "col-task": "Digital Contract KYC Verification Review",
          "col-status": "In Progress",
          "col-owner": "Executive Admin",
          "col-priority": "P1 - High",
          "col-due": "2026-08-28",
          "col-done": false,
        },
        created_at: new Date().toISOString(),
      },
    ];
  });

  // 2. Collaborative Notes Document State
  const [noteContent, setNoteContent] = useState<string>(() => {
    if (existingDoc?.notes) return existingDoc.notes;
    try {
      const saved = localStorage.getItem(`${storageKey}_notes`);
      if (saved) return saved;
    } catch {}
    return `# ${scopeTitle}\n\n### Strategic Briefing & Scope Definition\n- Enterprise SLA agreement active with HESICS Business OS.\n- Multi-channel API communication enabled.\n- Deliverables structured across sprint milestones.\n\n> Note: All documents and tables are synchronized in real-time.`;
  });

  // New Column Modal state
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("text");

  // Auto-persistence to LocalStorage + Cloud Firestore
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_cols`, JSON.stringify(columns));
      localStorage.setItem(`${storageKey}_rows`, JSON.stringify(rows));
      localStorage.setItem(`${storageKey}_notes`, noteContent);

      db.saveNotionWorkspace({
        id: scopeId,
        columns,
        rows,
        notes: noteContent,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }, [columns, rows, noteContent, storageKey, scopeId]);

  // Row Manipulation
  const handleAddRow = () => {
    const newRow: NotionRow = {
      id: `row-${Date.now()}`,
      cells: {},
      created_at: new Date().toISOString(),
    };
    setRows([...rows, newRow]);
    showToast("Row Added", "New record appended to table.", "success");
  };

  const handleCellChange = (rowId: string, colId: string, value: any) => {
    setRows(
      rows.map((r) => {
        if (r.id === rowId) {
          return { ...r, cells: { ...r.cells, [colId]: value } };
        }
        return r;
      }),
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(rows.filter((r) => r.id !== rowId));
    showToast("Row Deleted", "Record removed from table.");
  };

  // Column Manipulation
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: NotionColumn = {
      id: `col-${Date.now()}`,
      name: newColName.trim(),
      type: newColType,
      options:
        newColType === "select" || newColType === "status"
          ? ["Option 1", "Option 2", "Option 3"]
          : undefined,
    };

    setColumns([...columns, newCol]);
    setNewColName("");
    setShowAddCol(false);
    showToast(
      "Column Created",
      `Added ${newCol.name} (${newCol.type}) to database.`,
    );
  };

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((c) => c.id !== colId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-950/40 border-emerald-800/50 text-emerald-400";
      case "In Progress":
        return "bg-indigo-950/40 border-indigo-800/50 text-indigo-300";
      case "In Review":
        return "bg-amber-950/40 border-amber-800/50 text-amber-300";
      default:
        return "bg-[#181820] border-[#242430] text-[#707080]";
    }
  };

  return (
    <div className="hesics-card p-6 space-y-6">
      {/* Notion Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A22] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <TableIcon className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6] font-display">
                {scopeTitle}
              </h2>
              <p className="text-xs text-[#808090]">
                Dynamic Notion database & collaborative document space.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#09090D] border border-[#1C1C26] rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "table"
                  ? "bg-[#77727E] text-white shadow"
                  : "text-[#707080] hover:text-white"
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Database Table
            </button>
            <button
              onClick={() => setActiveSubTab("notes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === "notes"
                  ? "bg-[#77727E] text-white shadow"
                  : "text-[#707080] hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Block Notes
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: Dynamic Database Table */}
      {activeSubTab === "table" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#707080]">
              Showing{" "}
              <span className="text-[#F4F4F6] font-semibold">
                {rows.length}
              </span>{" "}
              entries ·{" "}
              <span className="text-[#F4F4F6] font-semibold">
                {columns.length}
              </span>{" "}
              properties
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCol(true)}
                className="hesics-btn-secondary text-xs py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5 text-[#77727E]" /> Add Property
              </button>
              <button
                onClick={handleAddRow}
                className="hesics-btn-primary text-xs py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" /> New Row
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-[#1A1A24] rounded-2xl bg-[#09090D]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0D0D12] border-b border-[#1A1A24] text-[#808090]">
                  <th className="p-3 w-10 text-center font-mono text-[10px] text-[#505060]">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className="p-3 font-semibold text-[#D4D4D8] border-r border-[#171720] min-w-[160px]"
                    >
                      <div className="flex items-center justify-between group">
                        <span className="truncate">{col.name}</span>
                        <span className="text-[9px] font-mono text-[#505060] uppercase">
                          {col.type}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="p-3 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#14141C]">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="p-8 text-center text-xs text-[#505060]"
                    >
                      Empty database. Click "New Row" to create entries.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rIdx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-[#111118] transition-colors"
                    >
                      <td className="p-3 text-center font-mono text-[10px] text-[#505060]">
                        {rIdx + 1}
                      </td>
                      {columns.map((col) => {
                        const val = row.cells[col.id];

                        if (col.type === "checkbox") {
                          return (
                            <td
                              key={col.id}
                              className="p-3 border-r border-[#171720]"
                            >
                              <input
                                type="checkbox"
                                checked={!!val}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.id,
                                    col.id,
                                    e.target.checked,
                                  )
                                }
                                className="rounded bg-[#14141C] border-[#22222E] text-[#77727E] focus:ring-0 cursor-pointer"
                              />
                            </td>
                          );
                        }

                        if (col.type === "status" && col.options) {
                          return (
                            <td
                              key={col.id}
                              className="p-2.5 border-r border-[#171720]"
                            >
                              <select
                                value={val || col.options[0]}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.id,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                className={`text-[11px] font-semibold px-2 py-1 rounded-md border bg-transparent cursor-pointer focus:outline-none ${getStatusBadge(val)}`}
                              >
                                {col.options.map((opt) => (
                                  <option
                                    key={opt}
                                    value={opt}
                                    className="bg-[#0D0D12] text-[#F4F4F6]"
                                  >
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.type === "date") {
                          return (
                            <td
                              key={col.id}
                              className="p-1.5 border-r border-[#171720] min-w-[140px]"
                            >
                              <DatePicker
                                value={val || ""}
                                onChange={(newVal) =>
                                  handleCellChange(row.id, col.id, newVal)
                                }
                                placeholder="Select date..."
                              />
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.id}
                            className="p-2.5 border-r border-[#171720]"
                          >
                            <input
                              type={col.type === "number" ? "number" : "text"}
                              value={val !== undefined ? val : ""}
                              onChange={(e) =>
                                handleCellChange(row.id, col.id, e.target.value)
                              }
                              placeholder="Empty..."
                              className="bg-transparent text-xs text-[#F4F4F6] placeholder-[#404050] focus:outline-none focus:bg-[#14141C] px-1.5 py-0.5 rounded w-full transition-all"
                            />
                          </td>
                        );
                      })}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-[#505060] hover:text-rose-400 p-1 rounded transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Row Button at bottom */}
          <button
            onClick={handleAddRow}
            className="w-full py-2.5 border border-dashed border-[#1E1E28] hover:border-[#77727E]/40 rounded-xl text-xs text-[#707080] hover:text-[#D4D4D8] flex items-center justify-center gap-2 transition-all bg-[#08080B]"
          >
            <Plus className="w-3.5 h-3.5" /> New Row Entry
          </button>
        </div>
      )}

      {/* VIEW 2: Rich Collaborative Notes */}
      {activeSubTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#707080]">
              Markdown enabled notes & strategy briefings
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Auto-saved to Cloud
            </span>
          </div>

          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={16}
            placeholder="Type notes, strategy briefings, or meeting minutes..."
            className="w-full bg-[#09090D] border border-[#1A1A24] rounded-2xl p-5 text-sm text-[#F4F4F6] font-mono leading-relaxed focus:outline-none focus:border-[#77727E] resize-y"
          />
        </div>
      )}

      {/* Add Column Modal */}
      {showAddCol && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-confirmDialog flex items-center justify-center p-4">
          <div className="bg-[#0D0D12] border border-[#22222B] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-3">
              <h3 className="text-xs font-bold text-[#F4F4F6]">
                New Database Property
              </h3>
              <button
                onClick={() => setShowAddCol(false)}
                className="text-[#606070] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddColumn} className="space-y-4">
              <div>
                <label className="hesics-label">Property Name *</label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Budget, Link, Milestone"
                  className="hesics-input text-xs"
                />
              </div>

              <div>
                <label className="hesics-label">Property Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as ColumnType)}
                  className="hesics-input text-xs w-full"
                >
                  <option value="text">Text / Description</option>
                  <option value="number">Number / Amount</option>
                  <option value="status">Status Badge</option>
                  <option value="select">Dropdown Select</option>
                  <option value="date">Date Picker</option>
                  <option value="checkbox">Checkbox Verified</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCol(false)}
                  className="hesics-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hesics-btn-primary text-xs px-4"
                >
                  Add Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
