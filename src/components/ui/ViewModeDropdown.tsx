import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid-3' | 'grid-4' | 'grid-5' | 'list';

interface ViewModeDropdownProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  className?: string;
}

export const ViewModeDropdown: React.FC<ViewModeDropdownProps> = ({
  viewMode,
  setViewMode,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popWidth = Math.min(160, viewportWidth - 24);
    const popHeight = 150;

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
    if (top + popHeight > viewportHeight - 12 && rect.top > popHeight + 12) {
      top = rect.top - popHeight - 6;
    }
    if (top < 12) top = 12;
    if (top + popHeight > viewportHeight - 12) {
      top = Math.max(12, viewportHeight - 12 - popHeight);
    }

    setPopStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popWidth}px`,
      zIndex: 851,
    });
  };

  const toggleDropdown = () => {
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

  return (
    <div ref={containerRef} className={`relative z-10 ${className}`}>
      <BaseButton
        type="button"
        size="sm"
        onClick={toggleDropdown}
        data-active={isOpen ? "true" : undefined}
        className={`h-[30px] min-h-[30px] max-h-[30px] py-0 px-2.5 rounded-lg transition-all duration-200 focus:outline-none flex items-center justify-center gap-1.5 cursor-pointer border-0 border-b active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] ${
          isOpen
            ? 'active is-selected bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] shadow-xs font-bold'
            : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-zinc-700 dark:text-zinc-300 hover:bg-[var(--btn-primary-bg)] font-medium'
        }`}
        title="切换布局，网格按可用宽度调整列数"
      >
        {viewMode === 'list' ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
        <span className="text-[10px] font-medium leading-none max-w-[80px] sm:max-w-[100px] truncate">
          布局
        </span>
      </BaseButton>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[850]" onClick={() => setIsOpen(false)} />
            <div
              style={popStyle}
              className="dropdown-panel modal-card bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95"
            >
              <div className="grid grid-cols-2 gap-1.5">
                <BaseButton
                  type="button"
                  onClick={() => { setViewMode('grid-3'); setIsOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-colors border ${
                    viewMode === 'grid-3'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex gap-[2px] w-5 h-5">
                    <div className="flex-1 bg-current rounded-sm"></div>
                    <div className="flex-1 bg-current rounded-sm"></div>
                    <div className="flex-1 bg-current rounded-sm"></div>
                  </div>
                  <span className="text-[10px] font-bold">最多 3 列</span>
                </BaseButton>
                <BaseButton
                  type="button"
                  onClick={() => { setViewMode('grid-4'); setIsOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-colors border ${
                    viewMode === 'grid-4'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex gap-[1px] w-5 h-5">
                    <div className="flex-1 bg-current rounded-sm"></div>
                    <div className="flex-1 bg-current rounded-sm"></div>
                    <div className="flex-1 bg-current rounded-sm"></div>
                    <div className="flex-1 bg-current rounded-sm"></div>
                  </div>
                  <span className="text-[10px] font-bold">最多 4 列</span>
                </BaseButton>
                <BaseButton
                  type="button"
                  onClick={() => { setViewMode('grid-5'); setIsOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-colors border ${
                    viewMode === 'grid-5'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex gap-[1px] w-5 h-5">
                    <div className="flex-1 bg-current rounded-[1px]"></div>
                    <div className="flex-1 bg-current rounded-[1px]"></div>
                    <div className="flex-1 bg-current rounded-[1px]"></div>
                    <div className="flex-1 bg-current rounded-[1px]"></div>
                    <div className="flex-1 bg-current rounded-[1px]"></div>
                  </div>
                  <span className="text-[10px] font-bold">最多 5 列</span>
                </BaseButton>
                <BaseButton
                  type="button"
                  onClick={() => { setViewMode('list'); setIsOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-colors border ${
                    viewMode === 'list'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex flex-col gap-[2px] w-5 h-5 justify-center">
                    <div className="w-full h-[2px] bg-current rounded-full"></div>
                    <div className="w-full h-[2px] bg-current rounded-full"></div>
                    <div className="w-full h-[2px] bg-current rounded-full"></div>
                  </div>
                  <span className="text-[10px] font-bold">列表</span>
                </BaseButton>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

