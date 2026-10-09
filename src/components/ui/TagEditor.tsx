import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { Tag as TagIcon, Plus, X, Shield, Lock } from 'lucide-react';
import { isFixedSystemTag } from '../../utils/tagUtils';

interface TagEditorProps {
  customTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  maxDisplay?: number;
  hideAddButton?: boolean;
}

export const TagEditor: React.FC<TagEditorProps> = ({ 
  customTags = [], 
  availableTags = [],
  onChange, 
  className = '', 
  maxDisplay = 2, 
  hideAddButton = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [modalInputValue, setModalInputValue] = useState('');
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; right?: number }>({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Portal coordinates stay relative to the viewport, including inside contained detail panels.
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const popupWidth = Math.min(260, window.innerWidth - 32);
      const popupHeight = Math.min(popupRef.current?.offsetHeight || 220, window.innerHeight - 32);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - 16 - popupWidth));
      const below = rect.bottom + 6;
      const top = below + popupHeight <= window.innerHeight - 16
        ? below : Math.max(16, Math.min(rect.top - popupHeight - 6, window.innerHeight - 16 - popupHeight));
      setPopupPos({ top, left });
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAdd = (tag: string, fromModal: boolean = false) => {
    const trimmed = tag.trim();
    if (isFixedSystemTag(trimmed)) {
      if (fromModal) setModalInputValue('');
      else { setInputValue(''); setIsOpen(false); }
      return;
    }
    if (trimmed && !customTags.includes(trimmed)) {
      onChange([...customTags, trimmed]);
    }
    if (fromModal) {
      setModalInputValue('');
    } else {
      setInputValue('');
      setIsOpen(false);
    }
  };

  const handleRemove = (tag: string) => {
    // Fixed system tags like '酒馆' and '本地' cannot be removed by normal tag editing
    if (isFixedSystemTag(tag)) return;
    onChange(customTags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fromModal: boolean = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(fromModal ? modalInputValue : inputValue, fromModal);
    }
  };

  const displayTags = customTags.slice(0, maxDisplay);
  const hiddenCount = customTags.length > maxDisplay ? customTags.length - maxDisplay : 0;
  const unselectedAvailableTags = availableTags.filter(t => !isFixedSystemTag(t) && !customTags.includes(t));

  return (
    <>
      <div className={`flex items-center gap-1.5 flex-nowrap ${className}`} ref={ref}>
        {displayTags.map(tag => {
          const isFixed = isFixedSystemTag(tag);
          return (
            <span
              key={tag}
              className={`flex items-center h-[21px] gap-1 pl-1.5 pr-0.5 rounded text-[10px] font-medium transition-all whitespace-nowrap shrink-0 ${
                isFixed
                  ? tag.includes('酒馆')
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-600/80 font-bold shadow-xs'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-400 dark:border-blue-600/80 font-bold shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700'
              }`}
            >
              {isFixed && <span className="text-[9px] opacity-70">固定:</span>}
              {tag}
              {!isFixed && (
                <span role="button" onClick={() => handleRemove(tag)} className="p-0.5 hover:text-rose-500 transition-colors cursor-pointer shrink-0 flex items-center justify-center" title="删除标签"><X className="w-2.5 h-2.5 text-zinc-400 hover:text-rose-500" /></span>
              )}
            </span>
          );
        })}
        
        {hiddenCount > 0 && (
          <BaseButton 
            type="button"
            size="xs"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-0.5 px-1.5 py-0 h-5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-[10px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            +{hiddenCount} 更多
          </BaseButton>
        )}
        
        {!hideAddButton && (
          <div className="relative flex-shrink-0">
            <BaseButton
              ref={btnRef}
              type="button"
              size="xs"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-0.5 px-1.5 py-0 h-5 rounded border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 text-zinc-600 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors text-[10px] bg-transparent whitespace-nowrap shrink-0 cursor-pointer"
              title="添加标签"
            >
              <Plus className="w-3 h-3" />
              <span>标签</span>
            </BaseButton>
            {isOpen && createPortal(
              <div ref={popupRef}
                style={{
                  position: 'fixed',
                  top: `${popupPos.top}px`,
                  left: `${popupPos.left}px`,
                  width: `${Math.min(260, window.innerWidth - 32)}px`,
                  maxWidth: 'calc(100vw - 32px)',
                  maxHeight: 'calc(100dvh - 32px)',
                  overflowY: 'auto',
                }}
                className="tag-editor-dropdown bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[999] flex flex-col p-2.5 animate-in fade-in zoom-in-95"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5">
                  <BaseInput
                    type="text"
                    autoFocus
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, false)}
                    placeholder="输入标签名称..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
                  />
                  <BaseButton
                    type="button"
                    onClick={() => handleAdd(inputValue, false)}
                    disabled={!inputValue.trim()}
                    className="px-2.5 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    添加
                  </BaseButton>
                </div>

                {/* Candidate tags quick pick */}
                {unselectedAvailableTags.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-1 max-h-32 overflow-y-auto">
                    <span className="text-[10px] text-zinc-400 font-medium">快捷添加已有标签：</span>
                    <div className="flex flex-wrap gap-1">
                      {unselectedAvailableTags.slice(0, 8).map(t => (
                        <BaseButton
                          key={t}
                          type="button"
                          onClick={() => handleAdd(t, false)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-zinc-600 dark:text-zinc-300 hover:text-amber-900 dark:hover:text-amber-200 transition-colors cursor-pointer"
                        >
                          + {t}
                        </BaseButton>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            , document.body)}
          </div>
        )}
      </div>

      {/* Full Tags Modal with Safe Boundaries */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
          <div 
            className="fixed inset-0 cursor-pointer"
            onClick={() => setIsModalOpen(false)}
            aria-label="关闭遮罩"
          />
          <div 
            className="relative z-10 w-full max-w-sm max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <TagIcon className="w-4 h-4 text-amber-500" />
                全部标签 ({customTags.length})
              </h3>
              <span role="button" onClick={() => setIsModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[50vh] flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {customTags.map(tag => {
                  const isFixed = isFixedSystemTag(tag);
                  return (
                    <span
                      key={tag}
                      className={`flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                        isFixed
                          ? tag.includes('酒馆')
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-600/80 font-bold shadow-xs'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-400 dark:border-blue-600/80 font-bold shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {isFixed && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">[固定来源]</span>}
                      {tag}
                      {!isFixed && (
                        <span role="button" onClick={() => handleRemove(tag)} className="p-0.5 hover:text-rose-500 transition-colors cursor-pointer shrink-0 flex items-center justify-center" title="删除"><X className="w-3 h-3 text-zinc-400 hover:text-rose-500" /></span>
                      )}
                    </span>
                  );
                })}
                {customTags.length === 0 && (
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 w-full text-center py-4">
                    暂无标签
                  </div>
                )}
              </div>

              {/* Candidate available tags in Modal */}
              {unselectedAvailableTags.length > 0 && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">快速选择已有标签：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {unselectedAvailableTags.map(t => (
                      <BaseButton
                        key={t}
                        type="button"
                        onClick={() => handleAdd(t, true)}
                        className="px-1.5 py-0 h-5 text-[10px] rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-zinc-600 dark:text-zinc-300 hover:text-amber-900 dark:hover:text-amber-200 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                      >
                        + {t}
                      </BaseButton>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center gap-2">
              <BaseInput
                type="text"
                value={modalInputValue}
                onChange={e => setModalInputValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, true)}
                placeholder="输入新标签..."
                className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
              />
              <BaseButton
                type="button"
                onClick={() => handleAdd(modalInputValue, true)}
                disabled={!modalInputValue.trim()}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                添加
              </BaseButton>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};


