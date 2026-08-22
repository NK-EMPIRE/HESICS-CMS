import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM" (24-hour stored format)
  onChange: (val: string) => void;
  label?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = "11:00",
  onChange,
  label,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse 24-hour time to 12-hour
  const [hStr, mStr] = (value || "11:00").split(":");
  const h24 = Number(hStr) || 11;
  const minute = Number(mStr) || 0;
  const isPM = h24 >= 12;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;

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

  const updateTime = (newH12: number, newM: number, newIsPM: boolean) => {
    let finalH24 = newH12 % 12;
    if (newIsPM) finalH24 += 12;
    const finalHStr = String(finalH24).padStart(2, "0");
    const finalMStr = String(newM).padStart(2, "0");
    onChange(`${finalHStr}:${finalMStr}`);
  };

  const formattedDisplay = `${hour12}:${String(minute).padStart(2, "0")} ${isPM ? "PM" : "AM"}`;

  return (
    <div
      ref={containerRef}
      data-custom-input
      className={`relative select-none ${className}`}
    >
      {label && <label className="hesics-label">{label}</label>}

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
          <Clock className="w-3.5 h-3.5 text-[#77727E] shrink-0" />
          <span className="font-mono text-xs text-[#F4F4F6] font-semibold">
            {formattedDisplay}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#707080] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#77727E]" : ""}`}
        />
      </div>

      {/* 12-Hour Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-modalDropdown w-64 bg-[#0D0D12] border border-[#282836] rounded-2xl p-4 shadow-2xl space-y-3 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[11px] font-bold text-[#D4D4D8] uppercase tracking-wider font-mono border-b border-[#1C1C26] pb-2">
            Select Time (12-Hour)
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Hour Selector */}
            <div>
              <span className="text-[10px] text-[#707080] block mb-1">
                Hour
              </span>
              <select
                value={hour12}
                onChange={(e) =>
                  updateTime(Number(e.target.value), minute, isPM)
                }
                className="hesics-input text-xs py-1.5 px-2 bg-[#121218] font-mono text-[#F4F4F6]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Minute Selector */}
            <div>
              <span className="text-[10px] text-[#707080] block mb-1">
                Minute
              </span>
              <select
                value={minute}
                onChange={(e) =>
                  updateTime(hour12, Number(e.target.value), isPM)
                }
                className="hesics-input text-xs py-1.5 px-2 bg-[#121218] font-mono text-[#F4F4F6]"
              >
                {["00", "15", "30", "45"].map((m) => (
                  <option key={m} value={Number(m)}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* AM / PM Toggle */}
            <div>
              <span className="text-[10px] text-[#707080] block mb-1">
                Period
              </span>
              <button
                type="button"
                onClick={() => updateTime(hour12, minute, !isPM)}
                className="w-full py-1.5 px-2 bg-[#161620] hover:bg-[#20202C] border border-[#282836] rounded-xl text-xs font-bold text-white transition-colors"
              >
                {isPM ? "PM" : "AM"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 bg-[#77727E] hover:bg-[#888390] text-white text-xs font-medium rounded-xl transition-all"
          >
            Confirm Time
          </button>
        </div>
      )}
    </div>
  );
};
