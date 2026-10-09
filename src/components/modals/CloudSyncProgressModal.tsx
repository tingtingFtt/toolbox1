import React, { useState } from 'react';
import {
  Cloud,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2,
  X,
  Lock,
  ShieldCheck,
  Loader2,
  Settings2,
  Wrench,
  Smartphone,
  Sparkles,
  FileCheck,
  ChevronRight,
  Database,
  Eye,
} from 'lucide-react';
import { SyncProgressUpdate, CategoryProgressItem } from '../../types/cloudSync';

export interface CloudSyncProgressModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  progress: SyncProgressUpdate | null;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onCancel?: () => void;
}

const CATEGORY_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  settings_center: Settings2,
  common_tools: Wrench,
  mobile_phone: Smartphone,
  sillytavern: Sparkles,
  manifest_signature: ShieldCheck,
};

export const CloudSyncProgressModal: React.FC<CloudSyncProgressModalProps> = ({
  isOpen,
  isMinimized,
  progress,
  onMinimize,
  onMaximize,
  onClose,
  onCancel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen || !progress) return null;

  const isDone = progress.phase === 'done';
  const isError = progress.phase === 'error';
  const isProcessing = !isDone && !isError;
  const percent = Math.min(100, Math.max(0, progress.percent || 0));

  // If minimized, display elegant floating pill/circle at bottom-right
  if (isMinimized) {
    return (
      <div
        data-design-id="cloud-sync-floating-ball"
        onClick={onMaximize}
        className="fixed bottom-6 right-24 z-[9990] flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-2xl border border-amber-500/30 bg-stone-900/95 text-stone-100 backdrop-blur-md cursor-pointer select-none transition-all duration-300 hover:scale-105 hover:border-amber-400 active:scale-95 group"
        title="点击展开云端同步详情"
      >
        <div className="relative flex items-center justify-center w-7 h-7">
          {/* Circular progress SVG */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-stone-700"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={isDone ? 'text-emerald-500' : isError ? 'text-rose-500' : 'text-amber-500'}
              strokeDasharray={`${percent}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isDone ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
          </div>
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[11px] font-bold text-stone-200">
              {isDone ? '云端同步完成' : isError ? '同步中断' : '加密同步中'}
            </span>
            <span className="text-[10px] font-mono text-amber-400">{percent}%</span>
          </div>
          <span className="text-[9px] text-stone-400 truncate max-w-[120px] mt-0.5">
            {progress.currentFileName || progress.currentStepText || '点击展开面板'}
          </span>
        </div>

        <Maximize2 className="w-3 h-3 text-stone-400 group-hover:text-amber-300 ml-0.5" />
      </div>
    );
  }

  // Full or compact modal view
  const categories = progress.categoryProgress
    ? Object.entries(progress.categoryProgress)
    : [];

  return (
    <div
      data-design-id="cloud-sync-modal-overlay"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] transition-all"
    >
      <div
        data-design-id="cloud-sync-modal-container"
        className={`w-full ${
          isExpanded ? 'max-w-3xl' : 'max-w-xl'
        } max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 transition-all duration-300`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header (Notice: use div, NOT h2/h3 to prevent ui.css font-size: 20px !important overrides) */}
        <div
          data-design-id="cloud-sync-modal-header"
          className="px-4 sm:px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-stone-800/80"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-rose-500" />
              ) : (
                <UploadCloud className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div
                className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2"
                style={{ fontSize: '14px', lineHeight: '1.2' }}
              >
                <span>网盘云端同步与时序加密推送</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                    isDone
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : isError
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isDone ? '已完成' : isError ? '异常' : `${percent}%`}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                全本地 AES-GCM-256 密文转换 · 文件名全脱敏加密 · 支持后台无感知推送
              </p>
            </div>
          </div>

          {/* Controls: Zoom/Fullscreen, Minimize, Close */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors"
              title={isExpanded ? '还原紧凑窗口' : '缩放展开宽屏窗口'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onMinimize}
              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors"
              title="缩小为悬浮球 (后台继续推送)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            {(isDone || isError) && (
              <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div
          data-design-id="cloud-sync-modal-body"
          className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs"
        >
          {/* Progress Header & Global Percentage Bar */}
          <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-800/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {progress.currentStepText || '正在处理中...'}
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                {progress.completedItems} / {progress.totalItems} ({percent}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500'
                    : isError
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Stats Pills */}
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-700/50">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <UploadCloud className="w-3 h-3 text-amber-500" />
                  已推送新文件:{' '}
                  <strong className="text-stone-700 dark:text-stone-200">
                    {progress.uploadedFiles ?? 0}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-emerald-500" />
                  比对跳过重复:{' '}
                  <strong className="text-stone-700 dark:text-stone-200">
                    {progress.skippedFiles ?? 0}
                  </strong>
                </span>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                端到端密文校验
              </span>
            </div>
          </div>

          {/* Current File & Filename Encryption Inspection Box */}
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                当前传输文件与文件名加密状态
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                云端文件名已脱敏
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0 w-16">本地名称:</span>
                <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                  {progress.currentFileName || '等待就绪...'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0 w-16">云端路径:</span>
                <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 truncate bg-amber-500/10 px-1.5 py-0.5 rounded flex-1">
                  {progress.currentEncryptedFileName
                    ? `raw_encrypted_assets/${progress.currentEncryptedFileName}`
                    : 'raw_encrypted_assets/sillytavern/.../enc_********.enc'}
                </span>
              </div>
            </div>
          </div>

          {/* Category-by-Category Progression Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium px-1">
              <span>模块分门别类加密进度</span>
              <span>{categories.filter(([, c]) => c.status === 'done').length} / {categories.length} 完成</span>
            </div>

            <div className="space-y-1.5">
              {categories.map(([key, cat]) => {
                const IconComponent = CATEGORY_ICON_MAP[key] || Database;
                const isCatDone = cat.status === 'done';
                const isCatProcessing = cat.status === 'processing';
                const isCatSkipped = cat.status === 'skipped';

                return (
                  <div
                    key={key}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isCatProcessing
                        ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15'
                        : isCatDone
                        ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : isCatSkipped
                        ? 'border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-800/30 opacity-60'
                        : 'border-stone-200/80 dark:border-stone-800 bg-white/50 dark:bg-stone-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isCatProcessing
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : isCatDone
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-800 dark:text-stone-200 truncate text-xs">
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
                          <span>
                            {isCatSkipped
                              ? '无变动，已跳过'
                              : `${cat.current} / ${cat.total} 项`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCatProcessing && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>加密推送中</span>
                        </div>
                      )}
                      {isCatDone && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>已完成</span>
                        </div>
                      )}
                      {isCatSkipped && (
                        <span className="text-[10px] text-stone-400">跳过</span>
                      )}
                      {cat.status === 'pending' && (
                        <span className="text-[10px] text-stone-400">队列等待</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          data-design-id="cloud-sync-modal-footer"
          className="px-4 sm:px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/80 flex items-center justify-between flex-shrink-0"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>AES-GCM-256 二进制高强度加密</span>
          </div>

          <div className="flex items-center gap-2">
            {!isDone && !isError && (
              <button
                type="button"
                onClick={onMinimize}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-medium transition-colors"
              >
                缩小后台运行
              </button>
            )}
            {isDone && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors"
              >
                同步完成
              </button>
            )}
            {isError && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white text-xs font-medium transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
