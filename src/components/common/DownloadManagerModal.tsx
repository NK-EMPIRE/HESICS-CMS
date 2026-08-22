import React, { useState } from "react";
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Calendar,
  Check,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { showToast } from "./Toast";

export type DownloadFormat = "pdf" | "excel" | "both";
export type DateRangeMode = "all" | "month" | "custom";

export interface DownloadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  totalRecordsCount: number;
  allowFormats?: { pdf?: boolean; excel?: boolean; both?: boolean };
  onExecuteDownload: (config: {
    format: DownloadFormat;
    dateMode: DateRangeMode;
    selectedMonth: number;
    selectedYear: number;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export const DownloadManagerModal: React.FC<DownloadManagerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = "Configure filtration parameters, choose export format, and download.",
  totalRecordsCount,
  allowFormats = { pdf: true, excel: true, both: true },
  onExecuteDownload,
}) => {
  const [format, setFormat] = useState<DownloadFormat>("pdf");
  const [dateMode, setDateMode] = useState<DateRangeMode>("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<
    "idle" | "filtering" | "generating" | "done"
  >("idle");

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    setIsProcessing(true);
    setProgressStep("filtering");

    try {
      await new Promise((r) => setTimeout(r, 400));
      setProgressStep("generating");

      await onExecuteDownload({
        format,
        dateMode,
        selectedMonth,
        selectedYear,
        startDate,
        endDate,
      });

      setProgressStep("done");
      showToast(
        "Export Completed",
        `${title} downloaded successfully.`,
        "success",
      );
      setTimeout(() => {
        setIsProcessing(false);
        setProgressStep("idle");
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Download error:", err);
      setIsProcessing(false);
      setProgressStep("idle");
      showToast(
        "Export Failed",
        "There was an issue generating your file.",
        "error",
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-confirmDialog flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-[#22222B] rounded-3xl w-full max-w-xl shadow-2xl shadow-black/90 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#1C1C26] bg-[#0A0A0E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Download className="w-4 h-4 text-[#77727E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6] font-display">
                {title}
              </h2>
              <p className="text-[11px] text-[#808090] mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-[#606070] hover:text-white p-1.5 rounded-xl hover:bg-[#16161D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-7 space-y-6">
          {/* Format Picker */}
          <div>
            <label className="hesics-label mb-2.5 block">
              1. Select Export Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {allowFormats.pdf && (
                <button
                  type="button"
                  onClick={() => setFormat("pdf")}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-xs font-medium transition-all ${
                    format === "pdf"
                      ? "border-[#77727E] bg-[#77727E]/15 text-[#F4F4F6] shadow-lg shadow-[#77727E]/10"
                      : "border-[#1C1C26] bg-[#09090D] text-[#707080] hover:border-[#2A2A38]"
                  }`}
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>Vector PDF</span>
                  <span className="text-[9px] text-[#606070]">
                    High-res document
                  </span>
                </button>
              )}

              {allowFormats.excel && (
                <button
                  type="button"
                  onClick={() => setFormat("excel")}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-xs font-medium transition-all ${
                    format === "excel"
                      ? "border-[#77727E] bg-[#77727E]/15 text-[#F4F4F6] shadow-lg shadow-[#77727E]/10"
                      : "border-[#1C1C26] bg-[#09090D] text-[#707080] hover:border-[#2A2A38]"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                  <span className="text-[9px] text-[#606070]">
                    Structured ledger
                  </span>
                </button>
              )}

              {allowFormats.both && (
                <button
                  type="button"
                  onClick={() => setFormat("both")}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-xs font-medium transition-all ${
                    format === "both"
                      ? "border-[#77727E] bg-[#77727E]/15 text-[#F4F4F6] shadow-lg shadow-[#77727E]/10"
                      : "border-[#1C1C26] bg-[#09090D] text-[#707080] hover:border-[#2A2A38]"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Both Formats</span>
                  <span className="text-[9px] text-[#606070]">
                    PDF + Spreadsheet
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="hesics-label mb-2.5 block">
              2. Date Filter & Scope
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3.5">
              {(["all", "month", "custom"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDateMode(m)}
                  disabled={isProcessing}
                  className={`p-2.5 rounded-xl border text-xs font-medium capitalize transition-all ${
                    dateMode === m
                      ? "border-[#77727E]/60 bg-[#77727E]/10 text-white"
                      : "border-[#1A1A22] bg-[#09090D] text-[#707080] hover:border-[#252532]"
                  }`}
                >
                  {m === "all"
                    ? "All Records"
                    : m === "month"
                      ? "By Month"
                      : "Custom Range"}
                </button>
              ))}
            </div>

            {dateMode === "month" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#09090D] border border-[#1A1A24] rounded-2xl">
                <div>
                  <label className="hesics-label">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="hesics-input text-xs w-full"
                    disabled={isProcessing}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="hesics-label">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="hesics-input text-xs w-full"
                    disabled={isProcessing}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {dateMode === "custom" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#09090D] border border-[#1A1A24] rounded-2xl">
                <div>
                  <label className="hesics-label">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="hesics-input text-xs w-full"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="hesics-label">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="hesics-input text-xs w-full"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Animated Download Status */}
          {isProcessing && (
            <div className="p-4 rounded-2xl bg-[#09090E] border border-[#1F1F2C] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D4D4D8] font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#77727E] animate-spin" />
                  {progressStep === "filtering" && "Filtering data records..."}
                  {progressStep === "generating" &&
                    "Rendering vector layout & spreadsheet..."}
                  {progressStep === "done" && "Download ready! Saving file..."}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {progressStep === "filtering"
                    ? "30%"
                    : progressStep === "generating"
                      ? "75%"
                      : "100%"}
                </span>
              </div>
              <div className="w-full bg-[#161620] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#77727E] to-emerald-400 h-full transition-all duration-300 rounded-full"
                  style={{
                    width:
                      progressStep === "filtering"
                        ? "30%"
                        : progressStep === "generating"
                          ? "75%"
                          : "100%",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-[#181822] bg-[#0A0A0E] flex items-center justify-between">
          <div className="text-[11px] text-[#606070]">
            Target scope:{" "}
            <span className="font-mono text-[#D4D4D8]">
              {totalRecordsCount}
            </span>{" "}
            available records
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="hesics-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartDownload}
              disabled={isProcessing}
              className="hesics-btn-primary text-xs px-6 py-2.5 gap-2 shadow-lg shadow-[#77727E]/20 disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Start Export</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
