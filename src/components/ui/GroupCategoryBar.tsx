import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { Settings, Plus, Layers, Search, Check, X } from 'lucide-react';

export interface GroupCategoryBarProps {
  groups: string[];
  currentGroup: string;
  onSelectGroup: (group: string) => void;
  getCount: (group: string) => number;
  totalCount: number;
  allGroupName?: string;
  
  onAddGroup?: () => void;
  onDeleteGroup?: (group: string) => void;
}

export const GroupCategoryBar: React.FC<GroupCategoryBarProps> = ({
  groups,
  currentGroup,
  onSelectGroup,
  getCount,
  totalCount,
  allGroupName = '全部分组',
  
  onAddGroup,
  onDeleteGroup
}) => {
  // We only display the first 5 groups as quick tabs.
  const visibleGroups = groups.slice(0, 5);
  
  let pressTimer: any = null;

  const handleTouchStart = (group: string) => {
    pressTimer = setTimeout(() => {
      if (onDeleteGroup) onDeleteGroup(group);
    }, 600); // 600ms long press
  };

  const handleTouchEnd = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Row 1: 全部分组, 添加分组, 设置 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <BaseButton
          type="button"
          size="sm"
          onClick={() => onSelectGroup(allGroupName)}
          data-active={currentGroup === allGroupName ? "true" : undefined}
          className={`h-[26px] min-h-0 max-h-[26px] py-0 px-2 text-[9.5px] font-semibold rounded-lg transition-all duration-200 focus:outline-none flex items-center justify-center gap-1 shrink-0 border-0 border-b active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] ${
            currentGroup === allGroupName
              ? 'active is-selected bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] shadow-xs font-bold'
              : 'bg-transparent border-b-[var(--line-soft,rgba(0,0,0,0.12))] hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text,#3f3f46)] hover:bg-[var(--btn-primary-bg)]'
          }`}
        >
          <span>{allGroupName}</span>
          <span className="text-[8.5px] opacity-75">({totalCount})</span>
        </BaseButton>

        <BaseButton
          id="btn-add-group"
          type="button"
          size="sm"
          onClick={() => {
            if (onAddGroup) onAddGroup();
            else window.dispatchEvent(new Event('open-group-manager-add'));
          }}
          className="h-[26px] min-h-0 max-h-[26px] py-0 px-2 text-[9.5px] font-medium rounded-lg border-0 border-b border-b-[var(--line-soft,rgba(0,0,0,0.12))] hover:border-b-[var(--line-focus)] bg-transparent text-[var(--dim,#52525b)] hover:text-[var(--accent)] hover:bg-[var(--btn-primary-bg)] transition-all duration-200 active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] focus:outline-none flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>添加分组</span>
        </BaseButton>

        <BaseButton
          type="button"
          size="sm"
          onClick={() => window.dispatchEvent(new Event('open-group-manager'))}
          className="h-[26px] min-h-0 max-h-[26px] py-0 px-1.5 text-[9.5px] font-medium rounded-lg border-0 border-b border-b-[var(--line-soft,rgba(0,0,0,0.12))] hover:border-b-[var(--line-focus)] bg-transparent text-[var(--dim,#71717a)] hover:text-[var(--accent)] hover:bg-[var(--btn-primary-bg)] transition-all duration-200 active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] focus:outline-none flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
          title="管理分组与标签"
        >
          <Settings className="w-3 h-3" />
          <span>设置</span>
        </BaseButton>
      </div>

      {/* Row 2: Visible Group Tabs - Height compressed */}
      {visibleGroups.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {visibleGroups.map((groupName) => {
            const count = getCount(groupName);
            const isSelected = currentGroup === groupName || ((groupName === '默认' || groupName === '未分组') && (currentGroup === '默认' || currentGroup === '未分组'));
            const displayLabel = groupName === '默认' ? '未分组' : groupName;
            return (
              <BaseButton
                type="button"
                size="sm"
                key={groupName}
                onClick={() => onSelectGroup(groupName)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (onDeleteGroup) onDeleteGroup(groupName);
                }}
                onTouchStart={() => handleTouchStart(groupName)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                data-active={isSelected ? "true" : undefined}
                className={`h-[22px] min-h-0 max-h-[22px] py-0 px-2 text-[9.5px] rounded-md transition-all duration-200 focus:outline-none flex items-center justify-center gap-1 shrink-0 border-0 border-b active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] ${
                  isSelected
                    ? 'active is-selected bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] shadow-xs font-bold'
                    : 'bg-transparent border-b-[var(--line-soft,rgba(0,0,0,0.12))] hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text,#52525b)] hover:bg-[var(--btn-primary-bg)] font-medium'
                }`}
              >
                <span className="truncate max-w-[130px] leading-none" title={groupName === '默认' ? '默认分组 (未分组)' : groupName}>{displayLabel}</span>
                <span className="text-[8.5px] opacity-70 leading-none">({count})</span>
              </BaseButton>
            );
          })}
        </div>
      )}
    </div>
  );
};

export interface CategoryFilterDropdownProps {
  groups: string[];
  currentGroup: string;
  onSelectGroup: (group: string) => void;
  allGroupName?: string;
  className?: string;
}

export const CategoryFilterDropdown: React.FC<CategoryFilterDropdownProps> = ({
  groups = [],
  currentGroup,
  onSelectGroup,
  allGroupName = '全部分组',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

  const isSelected = currentGroup !== allGroupName;

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

  const query = searchQuery.trim().toLowerCase();
  const filteredGroups = groups.filter((g) => !query || g.toLowerCase().includes(query));
  const showAllGroupOption = !query || allGroupName.toLowerCase().includes(query);

  return (
    <div ref={containerRef} className={`relative z-10 ${className}`}>
      <BaseButton
        type="button"
        size="sm"
        onClick={toggleDropdown}
        data-active={isOpen || isSelected ? "true" : undefined}
        className={`flex items-center gap-1.5 border-0 border-b rounded-lg px-2.5 h-[30px] min-h-[30px] max-h-[30px] py-0 transition-all duration-200 focus:outline-none cursor-pointer active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] ${
          isOpen || isSelected
            ? 'active is-selected bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] shadow-xs font-bold'
            : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-zinc-700 dark:text-zinc-300 hover:bg-[var(--btn-primary-bg)] font-medium'
        }`}
      >
        <Layers className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 scale-110' : ''}`} />
        <span className="text-[9.5px] font-medium leading-none truncate max-w-[110px]">
          {isSelected ? (currentGroup === '默认' ? '未分组' : currentGroup) : allGroupName}
        </span>
      </BaseButton>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[850]" onClick={() => setIsOpen(false)} />
            <div
              style={popStyle}
              className="modal-panel modal-card bg-[var(--modal-solid-bg,var(--card-solid-bg))] border border-[var(--line)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
            >
              {/* Header */}
              <div className="px-2.5 py-1.5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--group-card-bg)] flex-shrink-0">
                <h3 className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                  选择分组
                </h3>
                <div className="flex items-center gap-1.5">
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectGroup(allGroupName);
                      }}
                      className="h-5 px-1.5 text-[10px] text-[var(--dim)] hover:text-rose-500 font-medium transition-colors rounded leading-none flex items-center cursor-pointer border-0 bg-transparent"
                    >
                      重置选择
                    </button>
                  )}
                  <span role="button" onClick={() => setIsOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Search Input */}
              {groups.length > 0 && (
                <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--dim)] pointer-events-none" />
                    <BaseInput
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索分组..."
                      className="w-full h-7 pl-8 pr-2.5 text-[11px] rounded-lg bg-[var(--group-card-bg)] border border-[var(--line)] focus:border-[var(--accent)] text-[var(--text)] placeholder-[var(--faint)] focus:outline-none transition-all"
                    />
                    {searchQuery && (
                      <span role="button" onClick={() => setSearchQuery('')} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3 h-3" /></span>
                    )}
                  </div>
                </div>
              )}

              {/* Scrollable Body */}
              <div className="overflow-y-auto p-3 space-y-3 flex-1 custom-scrollbar">
                <div>
                  <div className="px-1 mb-1.5 text-[9px] font-bold text-[var(--dim)] uppercase tracking-wider">
                    分组列表
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {showAllGroupOption && (
                      <BaseButton
                        type="button"
                        onClick={() => {
                          onSelectGroup(allGroupName);
                          setIsOpen(false);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border cursor-pointer active:scale-95 ${
                          currentGroup === allGroupName
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs font-bold'
                            : 'bg-[var(--group-card-bg)] text-[var(--text)] border-[var(--line)] hover:border-[var(--line-focus)]'
                        }`}
                      >
                        {currentGroup === allGroupName && <Check className="w-3 h-3 text-white" />}
                        <span>{allGroupName}</span>
                      </BaseButton>
                    )}

                    {filteredGroups.map((group) => {
                      const isGroupSelected = currentGroup === group || ((group === '默认' || group === '未分组') && (currentGroup === '默认' || currentGroup === '未分组'));
                      const displayLabel = group === '默认' ? '未分组' : group;
                      return (
                        <BaseButton
                          key={group}
                          type="button"
                          onClick={() => {
                            onSelectGroup(group);
                            setIsOpen(false);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 border cursor-pointer active:scale-95 ${
                            isGroupSelected
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs font-bold'
                              : 'bg-[var(--group-card-bg)] text-[var(--text)] border-[var(--line)] hover:border-[var(--line-focus)]'
                          }`}
                        >
                          {isGroupSelected && <Check className="w-3 h-3 text-white" />}
                          <span title={group === '默认' ? '默认分组 (未分组)' : group}>{displayLabel}</span>
                        </BaseButton>
                      );
                    })}
                  </div>

                  {!showAllGroupOption && filteredGroups.length === 0 && (
                    <div className="text-center py-6 text-[11px] text-[var(--faint)]">未找到匹配的分组</div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 px-3 border-t border-[var(--line)] bg-[var(--group-card-bg)] flex items-center justify-between flex-shrink-0 text-[10px] text-[var(--dim)]">
                <span className="truncate max-w-[170px]">
                  当前: <strong className="text-[var(--text)]">{currentGroup}</strong>
                </span>
                <BaseButton
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 rounded-lg bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
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
