import React, { useState } from 'react';
import { CardEntry } from '../../types';
import { CardMatchDetail } from '../../utils/diffEngine';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import { AlertTriangle, CheckCircle2, Copy, GitBranch, Layers, RefreshCw, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export type DuplicateAction = 'new_version' | 'distinct_face' | 'overwrite' | 'skip';

export interface DuplicateConfirmModalProps {
  isOpen: boolean;
  incomingCard: CardEntry;
  matchDetail: CardMatchDetail;
  remainingCount?: number;
  onConfirm: (action: DuplicateAction, applyToAll: boolean) => void;
  onCancel: () => void;
}

export const DuplicateConfirmModal: React.FC<DuplicateConfirmModalProps> = ({
  isOpen,
  incomingCard,
  matchDetail,
  remainingCount = 0,
  onConfirm,
  onCancel,
}) => {
  const [applyToAll, setApplyToAll] = useState(false);
  const [selectedAction, setSelectedAction] = useState<DuplicateAction>(
    matchDetail.isExactHashMatch
      ? 'skip'
      : matchDetail.status === 'partially_different'
      ? 'new_version'
      : 'distinct_face'
  );

  if (!isOpen) return null;

  const { matchedCard, matchedVersionLabel, isExactHashMatch, status, similarity, changedFields, preliminaryReason } = matchDetail;
  const incData = incomingCard.rawData?.data || incomingCard.rawData || {};
  const extData = matchedCard.rawData?.data || matchedCard.rawData || {};

  const incDesc = (incData.description || '').trim();
  const extDesc = (extData.description || '').trim();

  const nextVerNumber = (matchedCard.versions?.length || 0) + 2;
  const nextVerLabel = `v${nextVerNumber}`;

  return (
    <div data-design-id="duplicate-confirm-modal-root" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] transition-opacity">
      <div 
        data-design-id="duplicate-confirm-modal-panel"
        className="modal-panel modal-card w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[var(--line,#e2d0bc)] bg-[var(--bg-paper,#f3eee8)] text-[var(--text-serif,#1a232d)]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div data-design-id="duplicate-confirm-header" className="px-5 py-3.5 border-b border-[var(--line,#e2d0bc)] flex items-center justify-between flex-shrink-0 bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div
                className="font-bold text-[var(--text-serif,#1a232d)]"
                style={{ fontSize: '14px', lineHeight: '1.2' }}
              >
                检测到重复或同名文件
              </div>
              <p className="text-[11px] text-[var(--dim,#647382)]">
                {preliminaryReason}，已完成哈希指纹与历史版本更迭比对
              </p>
            </div>
          </div>
          {remainingCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--btn-primary-bg,rgba(96,126,149,0.15))] text-[var(--accent,#607e95)] font-semibold">
              剩余待确认: {remainingCount + 1}
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Comparison Cards Grid */}
          <div data-design-id="duplicate-comparison-grid" className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Incoming File */}
            <BaseCard designId="duplicate-incoming-card" nested className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--dim,#647382)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  待导入文件 (Incoming)
                </span>
                <span className="font-mono text-[10px] opacity-75">
                  #{matchDetail.incomingHash.substring(0, 8)}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--line,#e2d0bc)] overflow-hidden flex-shrink-0 border border-[var(--line-soft,rgba(0,0,0,0.1))]">
                  {incomingCard.coverImage ? (
                    <img src={incomingCard.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm text-[var(--dim,#647382)]">
                      {incomingCard.name?.[0] || '卡'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[13px] text-[var(--text-serif,#1a232d)] truncate">
                    {incomingCard.name || '未命名卡片'}
                  </h4>
                  <p className="text-[10px] text-[var(--dim,#647382)] truncate font-mono mt-0.5">
                    {incomingCard.fileName || '未知文件名'}
                  </p>
                  <p className="text-[10px] text-[var(--faint,#929ea9)] mt-0.5">
                    作者: {incomingCard.author || '未知'}
                  </p>
                </div>
              </div>

              {incDesc && (
                <div className="text-[11px] text-[var(--text,#2b3540)] line-clamp-2 bg-[var(--bg-paper,#f3eee8)]/60 p-1.5 rounded border border-[var(--line-soft,rgba(0,0,0,0.06))]">
                  {incDesc}
                </div>
              )}
            </BaseCard>

            {/* Existing File */}
            <BaseCard designId="duplicate-existing-card" nested className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--dim,#647382)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  库中已有文件 (Library)
                </span>
                <span className="font-mono text-[10px] opacity-75">
                  #{matchDetail.matchedHash.substring(0, 8)}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--line,#e2d0bc)] overflow-hidden flex-shrink-0 border border-[var(--line-soft,rgba(0,0,0,0.1))]">
                  {matchedCard.coverImage ? (
                    <img src={matchedCard.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm text-[var(--dim,#647382)]">
                      {matchedCard.name?.[0] || '卡'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-[13px] text-[var(--text-serif,#1a232d)] truncate">
                      {matchedCard.name}
                    </h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607e95)]">
                      {matchedCard.activeVersionLabel || 'v1'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--dim,#647382)] truncate font-mono mt-0.5">
                    {matchedCard.fileName || '已有卡片'}
                  </p>
                  <p className="text-[10px] text-[var(--faint,#929ea9)] mt-0.5">
                    历史版本数: {matchedCard.versions?.length || 0} 个历史快照
                  </p>
                </div>
              </div>

              {extDesc && (
                <div className="text-[11px] text-[var(--text,#2b3540)] line-clamp-2 bg-[var(--bg-paper,#f3eee8)]/60 p-1.5 rounded border border-[var(--line-soft,rgba(0,0,0,0.06))]">
                  {extDesc}
                </div>
              )}
            </BaseCard>
          </div>

          {/* Diagnostic Hash & Version Diff Status Banner */}
          <div data-design-id="duplicate-diff-banner" className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isExactHashMatch
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : status === 'partially_different'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
          }`}>
            {isExactHashMatch ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : status === 'partially_different' ? (
              <GitBranch className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <div className="font-bold text-[12px] flex items-center justify-between">
                <span>
                  {isExactHashMatch
                    ? `哈希完全一致：与【${matchedVersionLabel}】100% 相同`
                    : status === 'partially_different'
                    ? `检测到版本更迭设定变更 (相似度 ${(similarity * 100).toFixed(0)}%)`
                    : `同名但内容完全不同 (相似度 ${(similarity * 100).toFixed(0)}%)`}
                </span>
                <span className="font-mono text-[10px] opacity-80 font-normal">
                  比对版本: {matchedVersionLabel}
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isExactHashMatch
                  ? '经 64-bit 哈希完整比对，此文件与库中已有版本的设定、问候语与词条完全相同，无需重复导入。'
                  : status === 'partially_different'
                  ? `比对结果：${changedFields.length > 0 ? `变动字段 [${changedFields.join('、')}]` : '部分文本微调'}。推荐升级为新版本 (${nextVerLabel})，系统将自动留存历史更迭记录。`
                  : '此文件与已有卡片设定差异极大，属于同名独立角色，建议另存为独立卡面。'}
              </p>
            </div>
          </div>

          {/* Action Choice Selection */}
          <div data-design-id="duplicate-strategy-options" className="space-y-2">
            <label className="font-bold text-[11px] text-[var(--dim,#647382)] block">
              请选择处理策略：
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option 1: New Version */}
              <BaseButton
                designId="duplicate-strategy-new-version-btn"
                type="button"
                onClick={() => setSelectedAction('new_version')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedAction === 'new_version'
                    ? 'border-[var(--accent,#607e95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607e95)] font-bold shadow-sm'
                    : 'border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] text-[var(--text-serif,#1a232d)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[var(--accent,#607e95)]" />
                    <span className="text-xs">升级为新版本 ({nextVerLabel})</span>
                  </div>
                  {status === 'partially_different' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent,#607e95)] text-white">推荐</span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--dim,#647382)] font-normal mt-1 leading-relaxed">
                  归档当前版本至历史记录，并将此文件作为最新活跃版本
                </p>
              </BaseButton>

              {/* Option 2: Distinct Face */}
              <BaseButton
                designId="duplicate-strategy-distinct-face-btn"
                type="button"
                onClick={() => setSelectedAction('distinct_face')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedAction === 'distinct_face'
                    ? 'border-[var(--accent,#607e95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607e95)] font-bold shadow-sm'
                    : 'border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] text-[var(--text-serif,#1a232d)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent,#607e95)]" />
                    <span className="text-xs">另存为同名独立卡面</span>
                  </div>
                  {status === 'completely_different' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent,#607e95)] text-white">推荐</span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--dim,#647382)] font-normal mt-1 leading-relaxed">
                  作为独立角色卡导入，并在两者之间建立同名卡面关联
                </p>
              </BaseButton>

              {/* Option 3: Overwrite */}
              <BaseButton
                designId="duplicate-strategy-overwrite-btn"
                type="button"
                onClick={() => setSelectedAction('overwrite')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedAction === 'overwrite'
                    ? 'border-[var(--accent,#607e95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607e95)] font-bold shadow-sm'
                    : 'border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] text-[var(--text-serif,#1a232d)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--accent,#607e95)]" />
                  <span className="text-xs">直接覆盖当前版本</span>
                </div>
                <p className="text-[10px] text-[var(--dim,#647382)] font-normal mt-1 leading-relaxed">
                  直接用此文件替换当前卡片内容，不增加版本号
                </p>
              </BaseButton>

              {/* Option 4: Skip */}
              <BaseButton
                designId="duplicate-strategy-skip-btn"
                type="button"
                onClick={() => setSelectedAction('skip')}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedAction === 'skip'
                    ? 'border-[var(--accent,#607e95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607e95)] font-bold shadow-sm'
                    : 'border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] text-[var(--text-serif,#1a232d)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-[var(--accent,#607e95)]" />
                    <span className="text-xs">跳过不导入 (忽略)</span>
                  </div>
                  {isExactHashMatch && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">推荐</span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--dim,#647382)] font-normal mt-1 leading-relaxed">
                  保持现有库中卡片不变，放弃导入该文件
                </p>
              </BaseButton>
            </div>
          </div>

          {/* Apply to all checkbox */}
          {remainingCount > 0 && (
            <label className="flex items-center gap-2 pt-2 cursor-pointer select-none text-[11px] text-[var(--text,#2b3540)]">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded border-[var(--line,#e2d0bc)] text-[var(--accent,#607e95)] focus:ring-[var(--accent,#607e95)]"
              />
              <span>对此批次后续所有重复或同名文件应用相同策略 (共 {remainingCount} 个)</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div data-design-id="duplicate-confirm-footer" className="px-5 py-3.5 border-t border-[var(--line,#e2d0bc)] flex items-center justify-between gap-2 flex-shrink-0 bg-[var(--btn-primary-bg,rgba(96,126,149,0.05))]">
          <BaseButton
            designId="duplicate-confirm-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] text-[var(--text-serif,#1a232d)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            终止全部导入
          </BaseButton>

          <BaseButton
            designId="duplicate-confirm-submit-btn"
            type="button"
            onClick={() => onConfirm(selectedAction, applyToAll)}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--accent,#607e95)] hover:bg-[var(--accent-hover,#486175)] text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>确认执行</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </BaseButton>
        </div>
      </div>
    </div>
  );
};
