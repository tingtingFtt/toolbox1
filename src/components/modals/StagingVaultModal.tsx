import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../ui/CustomSelect';
import { BaseCard } from '../ui/BaseCard';
import { StagedDuplicateCard } from '../../types';
import {
  Inbox,
  X,
  CheckCircle2,
  Trash2,
  GitBranch,
  Layers,
  RefreshCw,
  XCircle,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  Search
} from 'lucide-react';

export interface StagingVaultModalProps {
  isOpen: boolean;
  stagedCards: StagedDuplicateCard[];
  onClose: () => void;
  onApplyDecisions: (decisions: Array<{ stagedId: string; action: 'skip' | 'new_version' | 'distinct_face' | 'overwrite' }>) => void;
  onClearAll: () => void;
}

export const StagingVaultModal: React.FC<StagingVaultModalProps> = ({
  isOpen,
  stagedCards,
  onClose,
  onApplyDecisions,
  onClearAll: _onClearAll,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [individualActions, setIndividualActions] = useState<Record<string, 'skip' | 'new_version' | 'distinct_face' | 'overwrite'>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [searchFilter]);
  useEffect(() => setPage(p => Math.min(p, Math.max(0, Math.ceil(stagedCards.length / 50) - 1))), [stagedCards.length]);

  if (!isOpen) return null;

  const filteredCards = stagedCards.filter(sc => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const nameMatch = (sc.incomingCard.name || '').toLowerCase().includes(q);
    const fileMatch = (sc.incomingCard.fileName || '').toLowerCase().includes(q);
    const authorMatch = (sc.incomingCard.author || '').toLowerCase().includes(q);
    return nameMatch || fileMatch || authorMatch;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCards.length && filteredCards.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCards.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSetBatchPreset = (action: 'skip' | 'new_version' | 'distinct_face' | 'overwrite') => {
    const targetIds = selectedIds.length > 0 ? selectedIds : stagedCards.map(c => c.id);
    const updated = { ...individualActions };
    targetIds.forEach(id => {
      updated[id] = action;
    });
    setIndividualActions(updated);
  };

  // Execute decision for selected items immediately
  const handleApplySelectedWithAction = (action: 'skip' | 'new_version' | 'distinct_face' | 'overwrite') => {
    if (selectedIds.length === 0) return;
    const decisions = selectedIds.map(id => ({
      stagedId: id,
      action
    }));
    onApplyDecisions(decisions);
    setSelectedIds([]);
    if (selectedIds.length === stagedCards.length) {
      onClose();
    }
  };

  // Delete/Skip selected cards only
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const decisions = selectedIds.map(id => ({
      stagedId: id,
      action: 'skip' as const
    }));
    onApplyDecisions(decisions);
    setSelectedIds([]);
    if (selectedIds.length === stagedCards.length) {
      onClose();
    }
  };

  // Import All with specific action
  const handleImportAllWithAction = (action: 'new_version' | 'distinct_face' | 'overwrite') => {
    const decisions = stagedCards.map(sc => ({
      stagedId: sc.id,
      action
    }));
    onApplyDecisions(decisions);
    onClose();
  };

  // Execute currently configured decisions for all staged cards
  const handleConfirmAllDecisions = () => {
    const decisions = stagedCards.map(sc => ({
      stagedId: sc.id,
      action: individualActions[sc.id] || sc.userDecision || 'new_version'
    }));
    onApplyDecisions(decisions);
    onClose();
  };

  // Skip all and clear
  const handleSkipAll = () => {
    const decisions = stagedCards.map(sc => ({
      stagedId: sc.id,
      action: 'skip' as const
    }));
    onApplyDecisions(decisions);
    onClose();
  };

  const allSelected = selectedIds.length === filteredCards.length && filteredCards.length > 0;
  const hasSelection = selectedIds.length > 0;

  return (
    <div data-design-id="staging-vault-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200">
      <div
        data-design-id="staging-vault-modal-panel"
        className="modal-panel modal-card relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[var(--line,#e2d0bc)] bg-[var(--bg-paper,#f3eee8)] text-[var(--text-serif,#1a232d)] animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div data-design-id="staging-vault-header" className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-[var(--line,#e2d0bc)] flex items-center justify-between flex-shrink-0 bg-[var(--btn-primary-bg,rgba(217,119,6,0.06))]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Inbox className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div
                className="font-bold text-[var(--text-serif,#1a232d)] flex items-center gap-1.5 truncate staging-vault-modal-title"
                style={{ fontSize: '13px', lineHeight: '1.3' }}
              >
                <span>重复角色卡暂存处</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30 shrink-0">
                  {stagedCards.length} 张待处理
                </span>
              </div>
            </div>
          </div>

          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* Global Batch Action Bar */}
        <div data-design-id="staging-vault-action-bar" className="px-3 sm:px-4 py-1.5 bg-[var(--btn-bg,rgba(226,208,188,0.2))] border-b border-[var(--line,#e2d0bc)] flex flex-col gap-1.5 text-xs flex-shrink-0">
          {/* Row 1: Select All & Bottom-lined ONLY Search Input (No rounded border box) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                data-design-id="staging-vault-select-all-btn"
                type="button"
                onClick={handleSelectAll}
                className={`flex items-center gap-1 h-5.5 px-2 rounded border transition-colors font-bold cursor-pointer text-[10px] sm:text-[11px] shrink-0 leading-none ${
                  allSelected
                    ? 'border-[var(--accent,#D97706)] bg-[var(--accent,#D97706)]/15 text-[var(--accent,#D97706)]'
                    : 'border-[var(--line,#e2d0bc)] hover:bg-white/60 dark:hover:bg-zinc-800 text-[var(--text-serif,#1a232d)]'
                }`}
              >
                {allSelected ? (
                  <CheckSquare className="w-3 h-3 text-[var(--accent,#D97706)]" />
                ) : (
                  <Square className="w-3 h-3 text-zinc-400" />
                )}
                <span>
                  {hasSelection ? `已选 ${selectedIds.length}` : '全选'}
                </span>
              </button>

              {/* Bottom border ONLY, No rounded border box, with active focus state */}
              <div className="relative flex items-center min-w-0 flex-1 max-w-xs">
                <Search className="w-3 h-3 text-zinc-400 absolute left-0 pointer-events-none" />
                <input
                  data-design-id="staging-vault-search-input"
                  type="text"
                  placeholder="搜索角色名 / 文件名..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-4.5 pr-1 py-0.5 text-xs bg-transparent border-t-0 border-l-0 border-r-0 border-b border-[var(--line,#e2d0bc)] rounded-none text-[var(--text-serif,#1a232d)] placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-[var(--accent,#D97706)] focus:bg-[var(--accent,#D97706)]/5 transition-all"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            <span className="text-[10px] text-zinc-500 font-medium shrink-0 hidden sm:inline">
              {hasSelection ? `对已选 (${selectedIds.length}) 项批量设置:` : '全量预设动作:'}
            </span>
          </div>

          {/* Row 2: 4 Batch Preset Buttons strictly in one row on mobile and desktop, compressed height h-5.5 */}
          <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-1.5 sm:justify-end">
            <button
              data-design-id="staging-vault-batch-new-version-btn"
              type="button"
              onClick={() => handleSetBatchPreset('new_version')}
              className="h-5.5 px-1 sm:px-2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer truncate text-center flex items-center justify-center leading-none"
            >
              <span className="sm:hidden">升级新版</span>
              <span className="hidden sm:inline">升级为新版本</span>
            </button>
            <button
              data-design-id="staging-vault-batch-distinct-face-btn"
              type="button"
              onClick={() => handleSetBatchPreset('distinct_face')}
              className="h-5.5 px-1 sm:px-2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer truncate text-center flex items-center justify-center leading-none"
            >
              <span className="sm:hidden">独立卡面</span>
              <span className="hidden sm:inline">同名独立卡面</span>
            </button>
            <button
              data-design-id="staging-vault-batch-overwrite-btn"
              type="button"
              onClick={() => handleSetBatchPreset('overwrite')}
              className="h-5.5 px-1 sm:px-2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer truncate text-center flex items-center justify-center leading-none"
            >
              直接覆盖
            </button>
            <button
              data-design-id="staging-vault-batch-skip-btn"
              type="button"
              onClick={() => handleSetBatchPreset('skip')}
              className="h-5.5 px-1 sm:px-2 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer truncate text-center flex items-center justify-center leading-none"
            >
              <span className="sm:hidden">跳过不存</span>
              <span className="hidden sm:inline">跳过不导入</span>
            </button>
          </div>
        </div>

        {/* Scrollable List of Staged Cards */}
        <div data-design-id="staging-vault-card-list" className="p-2 sm:p-3 overflow-y-auto space-y-2 flex-1 text-xs relative">
          {filteredCards.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-500 mx-auto" />
              <div className="font-bold text-xs text-zinc-700 dark:text-zinc-200" style={{ fontSize: '12px' }}>
                暂存处暂无待复核的重复卡片
              </div>
              <p className="text-[11px] text-zinc-500">所有本地卡面已全部顺利入库或已完成决策</p>
            </div>
          ) : (
            filteredCards.slice(page * 50, page * 50 + 50).map((staged) => {
              const inc = staged.incomingCard;
              const ext = staged.matchedCard;
              const currentAction = individualActions[staged.id] || staged.userDecision || 'new_version';
              const isSelected = selectedIds.includes(staged.id);

              return (
                <BaseCard
                  key={staged.id}
                  designId={`staging-vault-card-${staged.id}`}
                  nested
                  className={`p-2 sm:p-2.5 transition-all ${
                    isSelected
                      ? 'border-[var(--accent,#D97706)] bg-[var(--btn-primary-bg,rgba(217,119,6,0.09))] ring-1 ring-[var(--accent,#D97706)]/30'
                      : 'border-[var(--line,#e2d0bc)] bg-[var(--btn-bg,rgba(226,208,188,0.15))] hover:border-zinc-400'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    {/* Top Row: Checkbox + Name Title + Single-line Action Selector */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          data-design-id={`staging-vault-check-${staged.id}`}
                          type="button"
                          onClick={() => handleToggleSelect(staged.id)}
                          className="text-zinc-400 hover:text-[var(--accent,#D97706)] cursor-pointer p-0.5 shrink-0 inline-flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[var(--accent,#D97706)]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600" />
                          )}
                        </button>

                        <div
                          className="font-bold text-xs text-[var(--text-serif,#1a232d)] truncate"
                          style={{ fontSize: '12px', lineHeight: '1.3' }}
                        >
                          {inc.name || ext.name || '未命名卡片'}
                        </div>
                      </div>

                      {/* Compact Action Selector: Single-line label + arrow */}
                      <div className="shrink-0 w-32 sm:w-40">
                        <CustomSelect
                          value={currentAction}
                          onChange={val => {
                            setIndividualActions(prev => ({ ...prev, [staged.id]: val }));
                          }}
                          className={`h-5.5 px-2 rounded border text-[10px] sm:text-[11px] font-bold flex flex-row items-center justify-between flex-nowrap whitespace-nowrap gap-1 cursor-pointer focus:outline-none leading-none ${
                            currentAction === 'skip'
                              ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                              : currentAction === 'new_version'
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : currentAction === 'distinct_face'
                              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                          }`}
                          options={[
                            {value: 'new_version', label: '🌟 升级新版本'},
                            {value: 'distinct_face', label: '🎭 另存独立卡'},
                            {value: 'overwrite', label: '⚡ 直接覆盖'},
                            {value: 'skip', label: '🚫 跳过不存'}
                          ]}
                        />
                      </div>
                    </div>

                    {/* Dual Comparison Cards: Top-to-Bottom stacked on mobile, Side-by-side on desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2">
                      {/* Left / Top: Incoming Card */}
                      <div className="p-1.5 sm:p-2 rounded-md border border-blue-500/25 bg-blue-500/5 dark:bg-blue-950/20 flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-[var(--line,#e2d0bc)] shadow-2xs">
                          {inc.coverImage ? (
                            <img src={inc.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-zinc-400">
                              {inc.name?.[0] || '卡'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold text-[var(--text-serif,#1a232d)] truncate">
                              待入库: {inc.fileName || inc.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium">
                              作者: {inc.author || '未知'}
                            </span>
                            <span className="text-[9px] text-zinc-500">待导入新版</span>
                          </div>
                        </div>
                      </div>

                      {/* Right / Bottom: Existing Library Card */}
                      <div className="p-1.5 sm:p-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-[var(--line,#e2d0bc)] shadow-2xs">
                          {ext.coverImage ? (
                            <img src={ext.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-zinc-400">
                              {ext.name?.[0] || '卡'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold text-[var(--text-serif,#1a232d)] truncate">
                              已存: {ext.fileName || ext.name}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--accent,#D97706)]/15 text-[var(--accent,#D97706)] font-bold shrink-0">
                              {ext.activeVersionLabel || 'v1'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[9px] text-zinc-500">
                              {ext.versions?.length || 0} 个快照
                            </span>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              重名
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </BaseCard>
              );
            })
          )}
        </div>

        <div className="flex justify-center gap-4 items-center py-2 text-xs border-t">
          <button disabled={!page} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span>{page + 1} / {Math.max(1, Math.ceil(filteredCards.length / 50))} 页 · 共 {filteredCards.length} 张</span>
          <button disabled={(page + 1) * 50 >= filteredCards.length} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
        {/* Floating Batch Action Popup when cards are selected (Ultra-compact & compressed) */}
        {hasSelection && (
          <div
            data-design-id="staging-vault-floating-selection-bar"
            className="absolute bottom-16 sm:bottom-14 left-2 right-2 sm:left-6 sm:right-6 z-40 bg-[var(--bg-paper,#f3eee8)]/98 dark:bg-zinc-900/98 backdrop-blur-md border border-[var(--accent,#D97706)]/50 rounded-lg shadow-xl px-2 py-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            {/* Row 1: Text status & unselect button */}
            <div className="flex items-center justify-between gap-2 px-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--text-serif,#1a232d)] flex items-center gap-1 truncate leading-none">
                <CheckSquare className="w-3 h-3 text-[var(--accent,#D97706)] shrink-0" />
                <span>已选中 <strong className="text-[var(--accent,#D97706)]">{selectedIds.length}</strong> 张卡面：</span>
              </span>
              <button
                data-design-id="staging-vault-unselect-all-btn"
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[10px] text-zinc-500 hover:text-rose-500 cursor-pointer flex items-center gap-0.5 px-1 py-0.5 rounded leading-none transition-colors"
              >
                <X className="w-2.5 h-2.5" />
                <span>取消选择</span>
              </button>
            </div>

            {/* Row 2: Ultra-compressed Action buttons height h-5.5 */}
            <div className="grid grid-cols-4 gap-1">
              <button
                data-design-id="staging-vault-import-sel-newver-btn"
                type="button"
                onClick={() => handleApplySelectedWithAction('new_version')}
                className="h-5.5 px-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition-all shadow-none cursor-pointer flex items-center justify-center gap-0.5 truncate leading-none"
              >
                <GitBranch className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">升级版本</span>
              </button>

              <button
                data-design-id="staging-vault-import-sel-distinct-btn"
                type="button"
                onClick={() => handleApplySelectedWithAction('distinct_face')}
                className="h-5.5 px-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold transition-all shadow-none cursor-pointer flex items-center justify-center gap-0.5 truncate leading-none"
              >
                <Layers className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">独立卡面</span>
              </button>

              <button
                data-design-id="staging-vault-import-sel-overwrite-btn"
                type="button"
                onClick={() => handleApplySelectedWithAction('overwrite')}
                className="h-5.5 px-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition-all shadow-none cursor-pointer flex items-center justify-center gap-0.5 truncate leading-none"
              >
                <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">直接覆盖</span>
              </button>

              <button
                data-design-id="staging-vault-skip-sel-btn"
                type="button"
                onClick={() => handleApplySelectedWithAction('skip')}
                className="h-5.5 px-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-700 dark:text-zinc-200 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-0.5 truncate leading-none"
              >
                <XCircle className="w-2.5 h-2.5 shrink-0 text-zinc-500" />
                <span className="truncate">放弃已选</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer: 5 Buttons arranged in TWO tidy rows with compressed height h-5.5 */}
        <div data-design-id="staging-vault-footer" className="px-3 sm:px-4 py-1.5 border-t border-[var(--line,#e2d0bc)] flex flex-col gap-1.5 flex-shrink-0 bg-[var(--btn-primary-bg,rgba(217,119,6,0.04))]">
          {/* Row 1: Left (Clear/Skip all, Delete Selected) + Right (Retain/Cancel) */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                data-design-id="staging-vault-skip-all-btn"
                type="button"
                onClick={handleSkipAll}
                className="h-5.5 px-2 text-[10px] sm:text-[11px] font-medium rounded border border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 leading-none"
              >
                <span>全部不导入并清空</span>
              </button>

              {/* Trash button: ONLY deletes selected staged cards */}
              <button
                data-design-id="staging-vault-delete-selected-btn"
                type="button"
                onClick={handleDeleteSelected}
                disabled={!hasSelection}
                title={hasSelection ? `删除已勾选的 ${selectedIds.length} 张卡片` : '请先勾选需要删除的卡片'}
                className={`h-5.5 px-1.5 text-[10px] sm:text-[11px] rounded border transition-colors flex items-center gap-1 shrink-0 leading-none ${
                  hasSelection
                    ? 'border-rose-300 text-rose-600 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/30 cursor-pointer'
                    : 'border-zinc-300/60 text-zinc-400 bg-transparent cursor-not-allowed opacity-50'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden xs:inline">{hasSelection ? `删除已选 (${selectedIds.length})` : '删除已选'}</span>
              </button>
            </div>

            <button
              data-design-id="staging-vault-cancel-btn"
              type="button"
              onClick={onClose}
              className="h-5.5 px-2 text-[10px] sm:text-[11px] font-medium rounded border border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(217,119,6,0.08))] text-[var(--text-serif,#1a232d)] transition-colors cursor-pointer whitespace-nowrap shrink-0 leading-none"
            >
              暂不处理 (保留暂存)
            </button>
          </div>

          {/* Row 2: One-click Upgrade All & Confirm Configured Decisions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              data-design-id="staging-vault-import-all-btn"
              type="button"
              onClick={() => handleImportAllWithAction('new_version')}
              className="h-5.5 px-2 text-[10px] sm:text-[11px] font-bold rounded bg-blue-600 hover:bg-blue-700 text-white shadow-none transition-all flex items-center justify-center gap-1 cursor-pointer truncate leading-none"
            >
              <Sparkles className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">一键全部升级导入</span>
            </button>

            <button
              data-design-id="staging-vault-submit-btn"
              type="button"
              onClick={handleConfirmAllDecisions}
              className="h-5.5 px-2 text-[10px] sm:text-[11px] font-bold rounded bg-[var(--accent,#D97706)] hover:bg-[var(--accent-hover,#B45309)] text-white shadow-none transition-all flex items-center justify-center gap-1 cursor-pointer truncate leading-none"
            >
              <span className="truncate">确认执行决策</span>
              <ArrowRight className="w-2.5 h-2.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

