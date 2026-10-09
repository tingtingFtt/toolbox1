import React, { useState } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { isFixedSystemTag } from '../../utils/tagUtils';

interface BatchTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (tags: string[]) => void;
  availableTags: string[];
  selectedCount: number;
}

export const BatchTagModal: React.FC<BatchTagModalProps> = ({
  isOpen,
  onClose,
  onApply,
  availableTags,
  selectedCount
}) => {
  const [inputValue, setInputValue] = useState('');
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (isFixedSystemTag(trimmed)) {
      setInputValue('');
      return;
    }
    if (trimmed && !tagsToAdd.includes(trimmed)) {
      setTagsToAdd([...tagsToAdd, trimmed]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tag: string) => {
    setTagsToAdd(tagsToAdd.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-transparent modal-backdrop animate-in fade-in">
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-[var(--line,#e6e3dd)] dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header p-4 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-amber-500" />
            批量添加标签
          </h3>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            将为选中的 <span className="font-bold text-amber-600 dark:text-amber-400">{selectedCount}</span> 个项目添加以下标签：
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <BaseInput
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入新标签或选择下方预设..."
                className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <BaseButton
                onClick={() => handleAddTag(inputValue)}
                disabled={!inputValue.trim()}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                添加
              </BaseButton>
            </div>

            {/* 待添加的标签列表 */}
            {tagsToAdd.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
                {tagsToAdd.map(tag => (
                  <span key={tag} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 rounded-md text-[10px] font-medium">
                    {tag}
                    <span role="button" onClick={() => handleRemoveTag(tag)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3 h-3 text-amber-700 dark:text-amber-300" /></span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 可选预设标签 */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">可选预设标签</div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableTags.filter(t => !isFixedSystemTag(t) && t.toLowerCase().includes(inputValue.toLowerCase())).map(tag => {
                  const isAdded = tagsToAdd.includes(tag);
                  return (
                    <BaseButton
                      key={tag}
                      onClick={() => {
                        if (isAdded) handleRemoveTag(tag);
                        else handleAddTag(tag);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 active:scale-95 border ${
                        isAdded
                          ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/60 dark:hover:bg-amber-900/60'
                          : 'bg-zinc-100 text-[var(--text-serif,#3f3f46)] border-transparent hover:bg-[var(--btn-bg,rgba(0,0,0,0.1))] hover:shadow-sm dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {isAdded && <Check className="w-3 h-3" />}
                      {tag}
                    </BaseButton>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer p-4 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex justify-end gap-2 bg-black/5 dark:bg-white/5">
          <BaseButton
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            取消
          </BaseButton>
          <BaseButton
            onClick={() => onApply(tagsToAdd)}
            disabled={tagsToAdd.length === 0}
            className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            确认添加
          </BaseButton>
        </div>
      </div>
    </div>
  );
};
