import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  title?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择',
  className = '',
  dropdownClassName = '',
  disabled = false,
  icon,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popWidth = Math.min(Math.max(rect.width, 140), viewportWidth - 24);
    const dropdownHeight = Math.min(options.length * 36 + 16, 240);

    let left = rect.left;
    if (left + popWidth > viewportWidth - 12) {
      left = rect.right - popWidth;
    }
    if (left + popWidth > viewportWidth - 12) {
      left = viewportWidth - 12 - popWidth;
    }
    if (left < 12) {
      left = 12;
    }

    let top = rect.bottom + 6;
    if (top + dropdownHeight > viewportHeight - 12 && rect.top > dropdownHeight + 12) {
      top = rect.top - dropdownHeight - 6;
    }
    if (top < 12) top = 12;
    if (top + dropdownHeight > viewportHeight - 12) {
      top = Math.max(12, viewportHeight - 12 - dropdownHeight);
    }

    setPopStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      minWidth: `${popWidth}px`,
      maxWidth: `${Math.min(280, viewportWidth - 24)}px`,
      zIndex: 851,
    });
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen]);

  const handleSelect = (optValue: string | number) => {
    setIsOpen(false);
    const syntheticEvent = {
      target: { value: optValue },
      currentTarget: { value: optValue },
    };
    try {
      onChange(optValue);
    } catch {
      onChange(syntheticEvent as any);
    }
  };

  const isFullWidth = className.includes('w-full');

  return (
    <div
      ref={containerRef}
      className={`relative z-10 ${isFullWidth ? 'w-full block' : 'inline-block shrink-0'} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        title={title}
        data-active={isOpen ? 'true' : undefined}
        className={`inline-flex items-center justify-center gap-0.5 transition-all cursor-pointer whitespace-nowrap min-h-0 ${
          className ||
          `h-[30px] px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium shadow-2xs`
        } ${isOpen ? 'active is-selected bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] font-bold' : ''}`}
      >
        <span className="inline-flex items-center gap-0.5 truncate">
          {icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown className={`w-2.5 h-2.5 text-zinc-400 shrink-0 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[850]" onClick={() => setIsOpen(false)} />
            <div
              style={popStyle}
              className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 overflow-y-auto max-h-60 custom-scrollbar animate-in fade-in zoom-in-95 ${dropdownClassName}`}
            >
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-zinc-400'
                        : isSelected
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
