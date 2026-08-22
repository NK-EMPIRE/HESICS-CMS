import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface DatePickerProps {
  value: string; // ISO date string "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
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

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date...",
  className = "",
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(
    isNaN(parsedDate.getTime())
      ? new Date().getFullYear()
      : parsedDate.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(parsedDate.getTime()) ? new Date().getMonth() : parsedDate.getMonth(),
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Check if dropdown should render upward to prevent clipping
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      
      // Check closest scrollable container if any
      const scrollParent = containerRef.current.closest('.overflow-y-auto');
      let spaceBelowParent = spaceBelow;
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        spaceBelowParent = parentRect.bottom - rect.bottom;
      }

      if ((spaceBelow < 360 || spaceBelowParent < 360) && rect.top > 250) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    onChange(`${today.getFullYear()}-${mm}-${dd}`);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const formatDisplay = (val: string) => {
    if (!val) return "";
    try {
      const parts = val.split("-");
      if (parts.length === 3) {
        const d = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
        );
        return d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
      return val;
    } catch {
      return val;
    }
  };

  return (
    <div
      ref={containerRef}
      data-custom-input
      className={`relative select-none ${className}`}
    >
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-[#08080A] border rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? "border-[#77727E] ring-2 ring-[#77727E]/25 bg-[#0D0D12]"
            : "border-[#1F1F26] hover:border-[#32323E]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-[#77727E] shrink-0" />
          <span
            className={`truncate font-mono ${value ? "text-[#F4F4F6]" : "text-[#505060]"}`}
          >
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-[#606070] hover:text-[#F4F4F6] p-0.5 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <span className="text-[10px] text-[#505060] font-mono">📅</span>
        )}
      </div>

      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 sm:left-auto right-0 sm:right-auto z-modalDropdown w-72 bg-[#0D0D12] border border-[#262632] rounded-2xl p-4 shadow-2xl space-y-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#F4F4F6]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-[#808090] hover:text-white hover:bg-[#16161E] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display tracking-tight text-xs font-bold">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-[#808090] hover:text-white hover:bg-[#16161E] rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#606070]">
            {DAYS.map((d) => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const day = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-8 flex items-center justify-center text-[11px] text-[#303038] font-mono"
                >
                  {day}
                </div>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const cellDate = `${viewYear}-${mm}-${dd}`;
              const isSelected = value === cellDate;
              const isToday = todayStr === cellDate;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto rounded-xl flex items-center justify-center text-[11px] font-mono transition-all ${
                    isSelected
                      ? "bg-[#77727E] text-white font-bold shadow-lg shadow-[#77727E]/30 scale-105"
                      : isToday
                        ? "border border-[#77727E]/60 text-[#D4D4D8] hover:bg-[#77727E]/15"
                        : "text-[#D4D4D8] hover:bg-[#1A1A24] hover:text-white"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-[#1C1C26] text-[11px]">
            <button
              type="button"
              onClick={handleClear}
              className="text-[#707080] hover:text-[#A0A0B0] transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[#D4D4D8] hover:text-white font-semibold hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
