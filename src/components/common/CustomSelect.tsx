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
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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
        className={`w-full px-3 py-2 bg-[#08080A] border rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-[#181820] bg-[#0A0A0E]'
            : isOpen
            ? 'border-[#1E9EFF] ring-1 ring-[#1E9EFF]/30 bg-[#0C0C10]'
            : 'border-[#1C1C22] hover:border-[#282832]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate font-medium ${selectedOption ? 'text-[#F4F4F6]' : 'text-[#505060]'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                selectedOption.badgeColor || 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#606070] transition-transform duration-200 shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-[#1E9EFF]' : ''
          }`}
        />
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

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[200px] max-h-60 overflow-y-auto bg-[#0D0D11] border border-[#202028] rounded-xl p-1 shadow-2xl space-y-0.5 animate-slide-up backdrop-blur-md">
          {searchable && (
            <div className="p-1.5 border-b border-[#181820] sticky top-0 bg-[#0D0D11] z-10">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#505060]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full pl-7 pr-2 py-1 bg-[#08080A] border border-[#1C1C22] rounded-md text-[11px] text-[#F4F4F6] placeholder-[#404050] focus:outline-none focus:border-[#1E9EFF]/50"
                  autoFocus
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-[#505060]">No matches found</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#1E9EFF]/15 text-[#1E9EFF] font-semibold'
                      : 'text-[#D4D4D8] hover:bg-[#15151C] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-[#606070] truncate">{opt.sublabel}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                          opt.badgeColor || 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1E9EFF]" />}
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