import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  image?: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const Combobox: React.FC<ComboboxProps> = ({ options, value, onChange, placeholder = "Select...", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.subLabel && option.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-2 rounded-lg border flex justify-between items-center cursor-pointer transition-colors
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70 dark:bg-gray-700' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'}
          ${isOpen ? 'ring-2 ring-primary-500 border-transparent' : 'border-gray-300 dark:border-gray-600'}
          dark:text-white
        `}
      >
        <span className="truncate flex items-center gap-2">
            {selectedOption ? (
                <>
                    {selectedOption.image && <img src={selectedOption.image} className="w-6 h-6 rounded object-cover" alt="" />}
                    <span className="font-medium">{selectedOption.label}</span>
                </>
            ) : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
             <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                   autoFocus
                   type="text"
                   className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-white"
                   placeholder="Search..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
             {filteredOptions.length === 0 ? (
                <div className="p-2 text-sm text-gray-500 text-center">No options found</div>
             ) : (
                filteredOptions.map(option => (
                   <div
                      key={option.value}
                      onClick={() => {
                         onChange(option.value);
                         setIsOpen(false);
                         setSearchTerm('');
                      }}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm
                         ${option.value === value 
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                   >
                      <div className="flex items-center gap-3">
                         {option.image && <img src={option.image} className="w-8 h-8 rounded bg-gray-200 object-cover" alt="" />}
                         <div className="flex flex-col">
                             <span className="font-medium">{option.label}</span>
                             {option.subLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{option.subLabel}</span>}
                         </div>
                      </div>
                      {option.value === value && <Check size={14} />}
                   </div>
                ))
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Combobox;
