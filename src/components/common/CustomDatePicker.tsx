import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface CustomDatePickerProps {
  dateValue: string; // "YYYY-MM-DD"
  onDateChange: (val: string) => void;
  timeValue?: string; // "HH:MM" in 24h
  onTimeChange?: (val: string) => void;
  showTimePicker?: boolean;
  label?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  dateValue,
  onDateChange,
  timeValue = '10:00',
  onTimeChange,
  showTimePicker = false,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date
  const parsedDate = dateValue ? new Date(dateValue) : new Date();
  const [currentMonth, setCurrentMonth] = useState(parsedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(parsedDate.getFullYear());

  // Parse time 12-hour format
  const [hour24, minuteStr] = (timeValue || '10:00').split(':').map(Number);
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onDateChange(`${currentYear}-${formattedMonth}-${formattedDay}`);
    if (!showTimePicker) setIsOpen(false);
  };

  const handleTimeChange12 = (newHour12: number, newMinute: number, newIsPM: boolean) => {
    if (!onTimeChange) return;
    let h24 = newHour12 % 12;
    if (newIsPM) h24 += 12;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(newMinute).padStart(2, '0');
    onTimeChange(`${hStr}:${mStr}`);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  return (
    <div className="relative" ref={containerRef} data-custom-input>
      {label && <label className="hesics-label">{label}</label>}

      {/* Button trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 bg-[#09090D] border border-[#1E1E28] hover:border-[#77727E]/60 rounded-xl text-xs text-[#F4F4F6] transition-all"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5 text-[#77727E]" />
          <span>{dateValue ? new Date(dateValue).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date'}</span>
        </div>
        {showTimePicker && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#9E9EA8] bg-[#14141C] px-2 py-0.5 rounded-md border border-[#20202A]">
            <Clock className="w-3 h-3 text-[#77727E]" />
            <span>{hour12}:{String(minuteStr || 0).padStart(2, '0')} {isPM ? 'PM' : 'AM'}</span>
          </div>
        )}
      </button>

      {/* Titanium Popover Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[#0E0E13] border border-[#262634] rounded-2xl p-4 shadow-2xl w-72 space-y-3">
          {/* Month Header */}
          <div className="flex items-center justify-between border-b border-[#1C1C26] pb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-[#181822] rounded-lg text-[#808090] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[#F4F4F6]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-[#181822] rounded-lg text-[#808090] hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#606070] font-mono">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const formattedMonth = String(currentMonth + 1).padStart(2, '0');
              const formattedDay = String(day).padStart(2, '0');
              const dayString = `${currentYear}-${formattedMonth}-${formattedDay}`;
              const isSelected = dateValue === dayString;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#77727E] text-white font-bold shadow'
                      : 'text-[#C4C4D0] hover:bg-[#161620] hover:text-white'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 12-Hour Time Picker */}
          {showTimePicker && onTimeChange && (
            <div className="pt-3 border-t border-[#1C1C26] space-y-2">
              <div className="text-[10px] text-[#707080] font-mono uppercase tracking-wider">12-Hour Time Format</div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {/* Hour */}
                <select
                  value={hour12}
                  onChange={(e) => handleTimeChange12(Number(e.target.value), minuteStr || 0, isPM)}
                  className="hesics-input text-xs py-1 px-2"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>

                {/* Minute */}
                <select
                  value={minuteStr || 0}
                  onChange={(e) => handleTimeChange12(hour12, Number(e.target.value), isPM)}
                  className="hesics-input text-xs py-1 px-2"
                >
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m} value={Number(m)}>{m}</option>
                  ))}
                </select>

                {/* AM / PM */}
                <button
                  type="button"
                  onClick={() => handleTimeChange12(hour12, minuteStr || 0, !isPM)}
                  className="px-2 py-1 bg-[#161620] border border-[#222230] rounded-xl text-xs font-bold text-white hover:border-[#77727E] transition-all"
                >
                  {isPM ? 'PM' : 'AM'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
