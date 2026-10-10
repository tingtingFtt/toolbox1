import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { ViewMode } from './ViewModeDropdown';

export function managementViewClass(mode: ViewMode) {
  if (mode === 'list') return 'grid-cols-1 gap-2';
  if (mode === 'grid-4') return 'grid-cols-4 gap-3';
  if (mode === 'grid-5') return 'grid-cols-5 gap-3';
  return 'grid-cols-3 gap-4';
}

export function ManagementListItem({ title, summary, source, selected, batchMode, onOpen, onSelect, onExport, onDelete }: {
  title: string; summary: string; source?: React.ReactNode; selected: boolean; batchMode: boolean;
  onOpen: () => void; onSelect: () => void; onExport?: () => void; onDelete?: () => void;
}) {
  return <div className={`min-w-0 p-3 border rounded-lg bg-white dark:bg-zinc-900 flex items-center flex-wrap sm:flex-nowrap gap-2 ${selected ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--line)]'}`}>
    {batchMode && <button type="button" aria-label={`选择 ${title}`} aria-pressed={selected} className="shrink-0 p-1" onClick={onSelect}>{selected ? <CheckSquare className="w-4 h-4 text-[var(--accent)]" /> : <Square className="w-4 h-4" />}</button>}
    <div className="flex-1 min-w-0">
      <button type="button" className="text-left w-full min-w-0" onClick={batchMode ? onSelect : onOpen}>
        <span className="block truncate text-xs font-bold" title={title}>{title}</span>
        <span className="block truncate text-[10px] text-[var(--dim)] mt-1" title={summary}>{summary}</span>
      </button>
      {source && <div className="mt-1 min-w-0">{source}</div>}
    </div>
    {!batchMode && <div className="flex gap-1 shrink-0 ml-auto flex-wrap">
      <ActionButton action="custom" onClick={onOpen}>详情</ActionButton>
      {onExport && <ActionButton action="export" onClick={onExport}>导出</ActionButton>}
      {onDelete && <ActionButton action="delete" onClick={onDelete}>删除</ActionButton>}
    </div>}
  </div>;
}
