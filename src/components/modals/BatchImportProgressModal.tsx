import React, { useState } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BatchImportProgressState, StagedDuplicateCard } from '../../types';
import {
  Loader2,
  Minimize2,
  Maximize2,
  X,
  CheckCircle2,
  Layers,
  GitBranch,
  FilePlus,
  Clock,
  Inbox,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  FastForward,
  Copy,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export interface BatchImportProgressModalProps {
  state: BatchImportProgressState;
  onMinimize: () => void;
  onMaximize: () => void;
  onCancel: () => void;
  onOpenStagingVault?: () => void;
  onClose: () => void;
  onApplyDuplicateDecision?: (decision: 'skip' | 'overwrite' | 'distinct_face' | 'new_version') => void;
}

export const BatchImportProgressModal: React.FC<BatchImportProgressModalProps> = ({
  state,
  onMinimize,
  onMaximize,
  onCancel,
  onOpenStagingVault,
  onClose,
  onApplyDuplicateDecision,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDuplicateList, setShowDuplicateList] = useState(false);
  const [selectedGlobalDecision, setSelectedGlobalDecision] = useState<'skip' | 'overwrite' | 'distinct_face'>('skip');

  if (!state.isActive) return null;

  const percentage = state.total > 0 ? Math.min(100, Math.round((state.current / state.total) * 100)) : 0;
  const elapsedSecs = Math.max(0, Math.floor((Date.now() - state.startTime) / 1000));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. MINIMIZED FLOATING BALL VIEW
  if (state.isMinimized) {
    const strokeWidth = 3.5;
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div data-design-id="batch-import-floating-ball-root" className="fixed bottom-6 right-6 z-[9999]">
        <div
          onClick={onMaximize}
          role="button"
          tabIndex={0}
          title={state.isCompleted ? '导入已完成，点击查看结果' : `正在批量导入 (${state.current}/${state.total})，点击展开`}
          className="group relative flex items-center justify-center w-16 h-16 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-2xl bg-stone-900/95 text-stone-100 backdrop-blur-md border-2 border-amber-500"
        >
          {/* Animated SVG Ring Progress */}
          <svg className="w-16 h-16 transform -rotate-90 pointer-events-none absolute inset-0">
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-stone-700 opacity-40"
              fill="transparent"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-amber-500 transition-all duration-300"
              fill="transparent"
            />
          </svg>

          {/* Center Content */}
          <div className="flex flex-col items-center justify-center text-center z-10 select-none">
            {state.isCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-bounce" />
            ) : (
              <>
                <span className="text-xs font-mono font-bold leading-none">{percentage}%</span>
                <span className="text-[9px] text-stone-400 font-mono scale-90 mt-0.5">
                  {state.current}/{state.total}
                </span>
              </>
            )}
          </div>

          {/* Duplicates Counter Badge */}
          {state.stats.stagedDuplicates > 0 && (
            <span className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-md">
              {state.stats.stagedDuplicates}
            </span>
          )}

          {/* Hover Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap bg-stone-900/90 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-sm border border-stone-700/50">
            <div className="font-bold flex items-center gap-1.5">
              {!state.isCompleted && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
              {state.isCompleted ? '导入完成！点击查看详情' : `正在导入: ${state.currentName || '正在比对卡片...'}`}
            </div>
            <div className="text-[10px] text-stone-300 mt-0.5 font-mono">
              进度: {state.current}/{state.total} · 已耗时: {formatTime(elapsedSecs)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL MODAL VIEW (Rescalable & Non-overflowing)
  const stagedCards = state.stagedCards || [];
  const duplicateCount = state.stats.stagedDuplicates || stagedCards.length;

  return (
    <div
      data-design-id="batch-import-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] transition-all duration-200"
    >
      <div
        data-design-id="batch-import-modal-container"
        className={`w-full ${
          isExpanded ? 'max-w-3xl' : 'max-w-xl'
        } max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 transition-all duration-300`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - NOTICE: We intentionally avoid h2/h3 tags to prevent ui.css .modal-panel h2/h3 (20px !important) overrides */}
        <div
          data-design-id="batch-import-header"
          className="px-4 sm:px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-stone-800/80"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                state.isCompleted
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {state.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <div
                className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2"
                style={{ fontSize: '14px', lineHeight: '1.2' }}
              >
                <span className="truncate">
                  {state.isCompleted ? '批量导入与查重已完成' : '角色卡大批量导入与两级查重中'}
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  {percentage}%
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                {state.isCompleted
                  ? '所有角色卡已完成解析、指纹比对与版本归档'
                  : '正在执行名称初筛与 64-bit 哈希深度去重比对'}
              </p>
            </div>
          </div>

          {/* Action Icons: Zoom Toggle, Minimize, Close */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? '还原紧凑窗口' : '缩放展开宽屏窗口'}
              className="p-1.5 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/50 rounded-lg transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onMinimize}
              title="缩小为悬浮球 (后台静默执行)"
              className="p-1.5 text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-700/50 rounded-lg transition-colors cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            {state.isCompleted && (
              <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div
          data-design-id="batch-import-body"
          className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-xs"
        >
          {/* Main Progress Bar Box */}
          <div className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-800/50 space-y-2">
            {/* Status Line: Current file & counter */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="shrink-0 text-stone-500 dark:text-stone-400 font-medium text-[11px]">
                  正在处理:
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 truncate text-[11px]">
                  {state.currentName || '正在准备...'}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-stone-700 dark:text-stone-300 shrink-0 whitespace-nowrap">
                {state.current} / {state.total}
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300 relative"
                style={{ width: `${percentage}%` }}
              >
                {!state.isCompleted && (
                  <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
                )}
              </div>
            </div>

            {/* Time & Remaining files */}
            <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono pt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                已耗时: {formatTime(elapsedSecs)}
              </span>
              <span>
                {state.isCompleted
                  ? state.currentPhase === 'aborted' ? '已取消，完成批次保留' : '已全部完成'
                  : `剩余待处理: ${Math.max(0, state.total - state.current)} 个文件`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px]" aria-label="导入流程">
            {[['parsing', '读取 / 类型识别'], ['diffing', '索引查重'], ['extracting', '分批入库'], ['complete', '完成']].map(([phase, label]) => <span key={phase} className={`px-2 py-1 border ${state.currentPhase === phase ? 'border-[var(--accent)] text-[var(--accent)] font-semibold' : 'opacity-60'}`}>{label}</span>)}
          </div>
          {/* Live Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 sm:p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 flex flex-col items-center text-center">
              <FilePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">全新入库</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {state.stats.added}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-900 dark:text-blue-300 flex flex-col items-center text-center">
              <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">升级新版本</span>
              <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                {state.stats.updatedVersion}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-900 dark:text-purple-300 flex flex-col items-center text-center">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">同名独立卡面</span>
              <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                {state.stats.distinctCard}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-300 flex flex-col items-center text-center">
              <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">暂缓库待定</span>
              <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                {duplicateCount}
              </span>
            </div>
          </div>

          {/* Duplicate Comparison & Resolution Section (Directly satisfies user requirement) */}
          {duplicateCount > 0 && (
            <div
              data-design-id="batch-import-duplicate-section"
              className="p-3 sm:p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                    发现 {duplicateCount} 张重复文件待确认
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowDuplicateList(!showDuplicateList)}
                    className="px-2 py-1 text-[10px] font-medium rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showDuplicateList ? '收起对比' : '查看对比清单'}</span>
                    {showDuplicateList ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>

                  {onOpenStagingVault && (
                    <button
                      type="button"
                      onClick={onOpenStagingVault}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>前往暂缓库</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Duplicate Strategy Notice */}
              <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                系统已进行哈希指纹去重。您可以选择统一导入策略，或在暂缓库中逐一对比文件内容并决策。
              </p>

              {/* Quick Policy Actions */}
              <div className="p-2 rounded-lg bg-white/60 dark:bg-stone-800/60 border border-amber-500/20 space-y-1.5">
                <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                  一键确定重复文件导入方式:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGlobalDecision('skip');
                      onApplyDuplicateDecision?.('skip');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all text-left flex items-center gap-1.5 ${
                      selectedGlobalDecision === 'skip'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <FastForward className="w-3 h-3 text-stone-500 shrink-0" />
                    <span>全部跳过 (保留本地)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGlobalDecision('overwrite');
                      onApplyDuplicateDecision?.('overwrite');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all text-left flex items-center gap-1.5 ${
                      selectedGlobalDecision === 'overwrite'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>全部覆盖 (更新本地)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGlobalDecision('distinct_face');
                      onApplyDuplicateDecision?.('distinct_face');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all text-left flex items-center gap-1.5 ${
                      selectedGlobalDecision === 'distinct_face'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-800 dark:text-purple-200'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/50 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Copy className="w-3 h-3 text-purple-500 shrink-0" />
                    <span>全部保留 (两份并存)</span>
                  </button>
                </div>
              </div>

              {/* Expandable Comparison List Preview */}
              {showDuplicateList && stagedCards.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                  {stagedCards.slice(0, 10).map((staged, idx) => {
                    const isExact = staged.matchDetail?.isExactHashMatch;
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {staged.incomingCard?.coverImage ? (
                            <img
                              src={staged.incomingCard.coverImage}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-md object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-stone-200 dark:bg-stone-700 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              {staged.incomingCard?.name || '未知卡面'}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">
                              匹配本地: {staged.matchedCard?.name || '同名卡'}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                            isExact
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isExact ? '哈希一致' : '内容差异'}
                        </span>
                      </div>
                    );
                  })}
                  {stagedCards.length > 10 && (
                    <div className="text-center text-[10px] text-stone-400 py-1">
                      还有 {stagedCards.length - 10} 张重复卡片，可在暂缓库中统一查看
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Auto Skipped info */}
          {state.stats.skipped > 0 && (
            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between px-1">
              <span className="flex items-center gap-1">
                <FastForward className="w-3.5 h-3.5 text-stone-400" />
                自动跳过完全重复卡片:
              </span>
              <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                {state.stats.skipped} 张
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          data-design-id="batch-import-footer"
          className="px-4 sm:px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 flex-shrink-0 bg-white dark:bg-stone-800/80"
        >
          {!state.isCompleted ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer shrink-0"
              >
                终止导入
              </button>

              <button
                type="button"
                onClick={onMinimize}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>缩小后台运行</span>
              </button>
            </>
          ) : (
            <>
              {duplicateCount > 0 && onOpenStagingVault ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStagingVault();
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>处理暂缓库中的 {duplicateCount} 张重复卡片</span>
                </button>
              ) : (
                <div className="text-xs text-stone-500 font-medium truncate">
                  批量导入完成，卡片已安全写入
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all cursor-pointer shrink-0"
              >
                完成
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

