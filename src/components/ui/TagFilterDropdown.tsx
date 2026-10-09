import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { Filter, Check, Tag, X, Search } from 'lucide-react';

interface TagFilterDropdownProps {
  builtInTags?: string[];
  customTags?: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export const TagFilterDropdown: React.FC<TagFilterDropdownProps> = ({
  builtInTags = [],
  customTags = [],
  selectedTags,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popWidth = Math.min(290, viewportWidth - 24);
    const popHeight = Math.min(340, viewportHeight - 32);

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
      height: `${popHeight}px`,
      zIndex: 851,
    });
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
      setSearchQuery('');
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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredCustomTags = customTags.filter((t) => !query || t.toLowerCase().includes(query));
  const filteredBuiltInTags = builtInTags.filter((t) => !query || t.toLowerCase().includes(query));

  const hasTags = builtInTags.length > 0 || customTags.length > 0;
  const hasFilteredResults = filteredCustomTags.length > 0 || filteredBuiltInTags.length > 0;

  return (
    <div ref={containerRef} className={`relative z-10 ${className}`}>
      <BaseButton
        type="button"
        size="sm"
        onClick={toggleDropdown}
        data-active={isOpen || selectedTags.length > 0 ? "true" : undefined}
        className={`flex items-center gap-1.5 border-0 border-b rounded-lg px-2.5 h-[30px] min-h-[30px] max-h-[30px] py-0 transition-all duration-200 focus:outline-none cursor-pointer active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] ${
          isOpen || selectedTags.length > 0
            ? 'active is-selected bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] shadow-xs font-bold'
            : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-zinc-700 dark:text-zinc-300 hover:bg-[var(--btn-primary-bg)] font-medium'
        }`}
      >
        <Filter className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 scale-110' : ''}`} />
        <span className="text-[10px] font-medium leading-none">
          {selectedTags.length > 0 ? `标签 (${selectedTags.length})` : '标签筛选'}
        </span>
      </BaseButton>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[850]" onClick={() => setIsOpen(false)} />
            <div
              style={popStyle}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
            >
              {/* Header */}
              <div className="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 flex-shrink-0">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  筛选标签
                </h3>
                <div className="flex items-center gap-1.5">
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="h-5 px-1.5 text-[10px] text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 font-medium transition-colors rounded leading-none flex items-center cursor-pointer border-0 bg-transparent"
                    >
                      清空已选
                    </button>
                  )}
                  <span role="button" onClick={() => setIsOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Tag Search Input */}
              {hasTags && (
                <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
                    <BaseInput
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索标签..."
                      className="w-full h-7 pl-8 pr-2.5 text-[11px] rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-amber-500/50 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none transition-all"
                    />
                    {searchQuery && (
                      <span role="button" onClick={() => setSearchQuery('')} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3 h-3" /></span>
                    )}
                  </div>
                </div>
              )}

              {/* Scrollable Body - Fixed Height Container */}
              <div className="overflow-y-auto p-3 space-y-3 flex-1 custom-scrollbar">
                {!hasTags ? (
                  <div className="text-center py-6 text-[11px] text-zinc-400">暂无可用的标签</div>
                ) : !hasFilteredResults ? (
                  <div className="text-center py-6 text-[11px] text-zinc-400">未找到匹配的标签</div>
                ) : (
                  <>
                    {filteredCustomTags.length > 0 && (
                      <div>
                        <div className="px-1 mb-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          自定义标签
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {filteredCustomTags.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <BaseButton
                                key={'c_' + tag}
                                type="button"
                                size="xs"
                                onClick={() => toggleTag(tag)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border cursor-pointer active:scale-95 ${
                                  isSelected
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-2xs font-bold'
                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-amber-500" />}
                                <span>{tag}</span>
                              </BaseButton>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredBuiltInTags.length > 0 && (
                      <div>
                        <div className="px-1 mb-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          自带标签
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {filteredBuiltInTags.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <BaseButton
                                key={'b_' + tag}
                                type="button"
                                size="xs"
                                onClick={() => toggleTag(tag)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border cursor-pointer active:scale-95 ${
                                  isSelected
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-2xs font-bold'
                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-amber-500" />}
                                <span>{tag}</span>
                              </BaseButton>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-2 px-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between flex-shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span>
                  {selectedTags.length > 0 ? `已选 ${selectedTags.length} 项` : '未选择标签'}
                </span>
                <BaseButton
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  完成
                </BaseButton>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
