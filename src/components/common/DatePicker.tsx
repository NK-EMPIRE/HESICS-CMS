import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // ISO date string "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date...',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date or default to current date
  const parsedDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(
    isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(parsedDate.getTime()) ? new Date().getMonth() : parsedDate.getMonth()
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

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
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange(`${today.getFullYear()}-${mm}-${dd}`);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Generate days in month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];

  // Format label for display
  const formatDisplay = (val: string) => {
    if (!val) return '';
    try {
      const parts = val.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return val;
    } catch {
      return val;
    }
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-[#08080A] border rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? 'border-[#1E9EFF] ring-1 ring-[#1E9EFF]/30 bg-[#0C0C10]'
            : 'border-[#1C1C22] hover:border-[#282832]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-[#1E9EFF] shrink-0" />
          <span className={`truncate font-mono ${value ? 'text-[#F4F4F6]' : 'text-[#484854]'}`}>
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
          <span className="text-[10px] text-[#404050] font-mono">📅</span>
        )}
      </div>

      {/* Hidden input for form validation */}
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
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-[#0D0D11] border border-[#202028] rounded-xl p-3 shadow-2xl space-y-2.5 animate-slide-up backdrop-blur-md">
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between text-xs font-semibold text-[#F4F4F6]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-[#808090] hover:text-white hover:bg-[#16161D] rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-display tracking-tight text-xs">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-[#808090] hover:text-white hover:bg-[#16161D] rounded transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#505060]">
            {DAYS.map((d) => (
              <div key={d} className="py-0.5">{d}</div>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Trailing days of previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const day = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-7 flex items-center justify-center text-[11px] text-[#303038] font-mono"
                >
                  {day}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const cellDate = `${viewYear}-${mm}-${dd}`;
              const isSelected = value === cellDate;
              const isToday = todayStr === cellDate;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-[11px] font-mono transition-all ${
                    isSelected
                      ? 'bg-[#1E9EFF] text-white font-bold shadow-md shadow-[#1E9EFF]/30 scale-105'
                      : isToday
                      ? 'border border-[#1E9EFF]/50 text-[#1E9EFF] hover:bg-[#1E9EFF]/10'
                      : 'text-[#D4D4D8] hover:bg-[#1A1A22] hover:text-white'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#181820] text-[11px]">
            <button
              type="button"
              onClick={handleClear}
              className="text-[#606070] hover:text-[#9090A0] transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[#1E9EFF] font-semibold hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};