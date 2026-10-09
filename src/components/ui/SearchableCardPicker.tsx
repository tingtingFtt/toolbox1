import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Users, User } from 'lucide-react';
import { NormalCardEntry } from '../../types';

export interface SearchableCardPickerProps {
  cards: NormalCardEntry[];
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
  placeholder?: string;
  filterOnlyNpc?: boolean;
  excludeCardId?: string;
  emptyMessage?: string;
  className?: string;
}

export const SearchableCardPicker: React.FC<SearchableCardPickerProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  placeholder = '选择角色卡...',
  filterOnlyNpc = false,
  excludeCardId,
  emptyMessage,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter cards by exclusion and NPC mode
  const eligibleCards = useMemo(() => {
    return cards.filter((c) => {
      if (excludeCardId && c.id === excludeCardId) return false;
      if (filterOnlyNpc) {
        return Boolean(c.isNpc || c.cardRole === 'npc');
      }
      return true;
    });
  }, [cards, excludeCardId, filterOnlyNpc]);

  // Filter by search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return eligibleCards;
    const q = searchQuery.trim().toLowerCase();
    return eligibleCards.filter((c) => {
      const name = (c.name || c.charName || c.fileName || '').toLowerCase();
      const cat = (c.category || '').toLowerCase();
      const tags = (c.customTags || c.tags || []).join(' ').toLowerCase();
      const brief = (c.brief || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || tags.includes(q) || brief.includes(q);
    });
  }, [eligibleCards, searchQuery]);

  const selectedCard = useMemo(() => {
    return cards.find((c) => c.id === selectedCardId);
  }, [cards, selectedCardId]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 px-2.5 text-left text-[10px] sm:text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-between gap-1.5 hover:border-purple-300 dark:hover:border-purple-700 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {selectedCard ? (
            <>
              {selectedCard.coverImage ? (
                <img
                  src={selectedCard.coverImage}
                  alt=""
                  className="w-4.5 h-4.5 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-4.5 h-4.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                  {selectedCard.isNpc || selectedCard.cardRole === 'npc' ? 'N' : '主'}
                </div>
              )}
              <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {selectedCard.name || selectedCard.charName || selectedCard.fileName}
              </span>
              <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex-shrink-0">
                {selectedCard.isNpc || selectedCard.cardRole === 'npc' ? 'NPC' : '主角'}
              </span>
            </>
          ) : (
            <span className="text-zinc-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 text-zinc-400">
          {selectedCard && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCard('');
              }}
              className="p-0.5 hover:text-rose-500 rounded"
              title="清除选择"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Floating In-page Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[220px]">
          {/* Search Box */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={filterOnlyNpc ? '搜索 NPC 配角名称...' : '搜索角色卡名称...'}
                className="w-full pl-6 pr-6 py-1 text-[10px] sm:text-[11px] h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {searchQuery && (
                <span role="button" onClick={() => setSearchQuery('')} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3 h-3" /></span>
              )}
            </div>
            <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-1 px-0.5">
              <span>{filterOnlyNpc ? '仅显示 NPC 配角' : '全部角色'}</span>
              <span>可选: {filteredCards.length} 位</span>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 no-scrollbar">
            {filteredCards.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-zinc-400">
                {emptyMessage || (filterOnlyNpc ? '未找到符合条件的 NPC 配角' : '未找到匹配的角色卡')}
              </div>
            ) : (
              filteredCards.map((c) => {
                const isSelected = c.id === selectedCardId;
                const isNpc = c.isNpc || c.cardRole === 'npc';
                const cardTitle = c.name || c.charName || c.fileName || '未命名';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCard(c.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 font-medium'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {c.coverImage ? (
                        <img
                          src={c.coverImage}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0 border border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                          {isNpc ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] sm:text-[11px] font-medium truncate">
                            {cardTitle}
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-bold flex-shrink-0 ${
                              isNpc
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {isNpc ? 'NPC' : '主角'}
                          </span>
                        </div>
                        {c.brief ? (
                          <p className="text-[9px] text-zinc-400 truncate">{c.brief}</p>
                        ) : c.category ? (
                          <p className="text-[9px] text-zinc-400 truncate">分组: {c.category}</p>
                        ) : null}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 mr-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
