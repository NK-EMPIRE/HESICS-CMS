import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  label,
  className = '',
  disabled = false,
  searchable = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart upward/downward positioning
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {label && <label className="hesics-label">{label}</label>}

      {/* Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full px-3.5 py-2.5 bg-[#08080A] border rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-[#181820] bg-[#0A0A0E]'
            : isOpen
            ? 'border-[#77727E] ring-2 ring-[#77727E]/25 bg-[#0D0D12]'
            : 'border-[#1F1F26] hover:border-[#32323E]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate font-medium text-xs ${selectedOption ? 'text-[#F4F4F6]' : 'text-[#606070]'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                selectedOption.badgeColor || 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#707080] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#77727E]' : ''
          }`}
        />
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

      {/* Popover Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-0 z-[9999] w-full min-w-[240px] max-h-64 overflow-y-auto bg-[#0D0D12] border border-[#262632] rounded-2xl p-1.5 shadow-2xl space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100`}
        >
          {searchable && (
            <div className="p-1.5 border-b border-[#1C1C24] sticky top-0 bg-[#0D0D12] z-10">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606070]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full pl-7 pr-2.5 py-1.5 bg-[#08080A] border border-[#1F1F28] rounded-lg text-xs text-[#F4F4F6] placeholder-[#505060] focus:outline-none focus:border-[#77727E]/60"
                  autoFocus
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="p-3.5 text-center text-xs text-[#606070]">No matches found</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#77727E]/20 text-[#F4F4F6] font-semibold border border-[#77727E]/30'
                      : 'text-[#D4D4D8] hover:bg-[#16161E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="min-w-0">
                      <div className="truncate text-xs">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-[#707080] truncate mt-0.5">{opt.sublabel}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.badge && (
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          opt.badgeColor || 'text-[#D4D4D8] bg-[#77727E]/15 border-[#77727E]/30'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#77727E]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
